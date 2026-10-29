import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../../config/apiConfig';
import { useAuth } from '../../contexts/AuthContext';
import { requestError } from './profileModel';

/**
 * Everything the profile page reads and writes, in one place, so no component builds a URL.
 *
 *   GET    /profiles/me                              the personal details and the linked platforms
 *   PUT    /profiles/me                              any part of the profile (only what is sent changes)
 *   DELETE /profiles/:platform  { confirm: true }    unlink a platform (its history goes too)
 *   POST   /auth/completeRegistration                finishes the first-time setup
 *   GET    /achievements                             the portfolio
 *   POST / PUT / DELETE /achievements[/:id]          add, change, remove one portfolio item
 *   GET    /achievements/certifications/catalog      the recognized certificates (loaded on first use)
 *
 * Every action that fails throws an Error whose message is a sentence for the student; the screen
 * shows it where the student is working. After a save the profile is read again, and the fields that
 * the rest of the app shows (name, department, picture) are copied into the signed-in user, so the
 * navbar never lags behind.
 *
 * Returns { status, profile, achievements, catalog, error, reload, saveProfile, unlinkPlatform,
 *           finishSetup, saveAchievement, deleteAchievement, loadCatalog }
 *   status   'loading' | 'ready' | 'error'
 */
export default function useProfileData() {
  const auth = useAuth();
  const token = auth?.token;
  const setAuthUser = auth?.setUser;
  const headers = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const [status, setStatus] = useState('loading');
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const alive = useRef(true);

  const readProfile = useCallback(async () => {
    const { data } = await axios.get(`${apiUrl}/profiles/me`, headers);
    if (alive.current) setProfile(data);
    return data;
  }, [headers]);

  /** The fields the rest of the app shows, copied into the signed-in user */
  const shareWithApp = useCallback(
    (data, extra = {}) => {
      if (!setAuthUser || !data) return;
      setAuthUser({
        name: data.name,
        department: data.department,
        section: data.section,
        rollNumber: data.rollNumber,
        graduatingYear: data.graduationYear,
        ...(data.profilePicture ? { profilePicture: data.profilePicture } : {}),
        ...extra,
      });
    },
    [setAuthUser]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    setError('');
    try {
      const [, list] = await Promise.all([readProfile(), axios.get(`${apiUrl}/achievements`, headers)]);
      if (!alive.current) return;
      setAchievements(Array.isArray(list.data) ? list.data : []);
      setStatus('ready');
    } catch (err) {
      if (!alive.current) return;
      setError(requestError(err, 'We could not load your profile. Check your connection and try again.'));
      setStatus('error');
    }
  }, [token, headers, readProfile]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const saveProfile = useCallback(
    async (payload) => {
      try {
        await axios.put(`${apiUrl}/profiles/me`, payload, headers);
        const data = await readProfile();
        shareWithApp(data);
        return data;
      } catch (err) {
        throw new Error(requestError(err, 'We could not save your changes. Try again in a moment.'));
      }
    },
    [headers, readProfile, shareWithApp]
  );

  const unlinkPlatform = useCallback(
    async (platform) => {
      try {
        await axios.delete(`${apiUrl}/profiles/${platform}`, { ...headers, data: { confirm: true } });
        return await readProfile();
      } catch (err) {
        if (err?.response?.status === 404) return readProfile();
        throw new Error(requestError(err, 'We could not unlink this platform. Try again in a moment.'));
      }
    },
    [headers, readProfile]
  );

  /** Saves the whole first-time setup and marks the profile complete, so the app stops asking for it */
  const finishSetup = useCallback(
    async (payload) => {
      try {
        const body = { ...payload, profileCompleted: true };
        await axios.put(`${apiUrl}/profiles/me`, body, headers);
        await axios.post(`${apiUrl}/auth/completeRegistration`, body, headers);
        const data = await readProfile();
        shareWithApp(data, { newUser: false, profileCompleted: true });
        return data;
      } catch (err) {
        throw new Error(requestError(err, 'We could not finish setting up your profile. Try again in a moment.'));
      }
    },
    [headers, readProfile, shareWithApp]
  );

  const saveAchievement = useCallback(
    async (id, body) => {
      try {
        const response = id ? await axios.put(`${apiUrl}/achievements/${id}`, body, headers) : await axios.post(`${apiUrl}/achievements`, body, headers);
        const saved = response.data;
        if (alive.current) setAchievements((list) => (id ? list.map((item) => (item._id === id ? saved : item)) : [saved, ...list]));
        return saved;
      } catch (err) {
        throw new Error(requestError(err, 'We could not save this item. Try again in a moment.'));
      }
    },
    [headers]
  );

  const deleteAchievement = useCallback(
    async (id) => {
      try {
        await axios.delete(`${apiUrl}/achievements/${id}`, headers);
        if (alive.current) setAchievements((list) => list.filter((item) => item._id !== id));
      } catch (err) {
        throw new Error(requestError(err, 'We could not delete this item. Try again in a moment.'));
      }
    },
    [headers]
  );

  const loadCatalog = useCallback(async () => {
    if (catalog) return catalog;
    try {
      const { data } = await axios.get(`${apiUrl}/achievements/certifications/catalog`, headers);
      const list = Array.isArray(data?.certifications) ? data.certifications : [];
      if (alive.current) setCatalog(list);
      return list;
    } catch {
      if (alive.current) setCatalog([]);
      return [];
    }
  }, [catalog, headers]);

  return { status, profile, achievements, catalog, error, reload: load, saveProfile, unlinkPlatform, finishSetup, saveAchievement, deleteAchievement, loadCatalog };
}
