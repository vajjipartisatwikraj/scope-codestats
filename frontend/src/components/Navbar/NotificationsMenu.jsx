import React, { useCallback, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon } from '@phosphor-icons/react/dist/csr/Bell';
import { BellSlashIcon } from '@phosphor-icons/react/dist/csr/BellSlash';
import { ChecksIcon } from '@phosphor-icons/react/dist/csr/Checks';
import { GearSixIcon } from '@phosphor-icons/react/dist/csr/GearSix';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { useNotifications } from '../../contexts/NotificationContext';
import { encodeNotificationId } from '../../pages/NotificationPage';
import useDismiss from './useDismiss';
import { formatNotificationTime } from './formatters';

/**
 * The bell and its list of notifications.
 *
 * The circle shows an accent dot while something is unread. Opening the list reads everything
 * (as it always has), so the dot clears; notifications that arrive while it is open show their
 * own unread dot until it is opened again. Choosing one marks it read and opens its page.
 */
const NotificationsMenu = () => {
  const navigate = useNavigate();
  const panelId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const close = useCallback(({ escape = false } = {}) => {
    setOpen(false);
    // After Escape, hand focus back to the bell
    if (escape) triggerRef.current?.focus();
  }, []);
  useDismiss(rootRef, open, close);

  const toggle = () => {
    if (!open && unreadCount > 0) markAllAsRead();
    setOpen((current) => !current);
  };

  const openNotification = (notification) => {
    markAsRead(notification._id);
    setOpen(false);
    navigate(`/notifications/${encodeNotificationId(notification._id)}`);
  };

  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  return (
    <div className="ds-navbar__menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ds-navbar__icon-button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        title="Notifications"
      >
        <BellIcon size={20} aria-hidden="true" />
        {unreadCount > 0 ? <span className="ds-navbar__dot" aria-hidden="true" /> : null}
      </button>

      <div
        id={panelId}
        className="ds-popover ds-notices"
        data-open={open ? 'true' : 'false'}
        role="dialog"
        aria-label="Notifications"
      >
        <div className="ds-notices__header">
          <h2 className="ds-notices__title">Notifications</h2>
          {notifications.length > 0 ? (
            <button
              type="button"
              className="ds-notices__ghost"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <ChecksIcon size={16} aria-hidden="true" />
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="ds-notices__body">
          {loading ? (
            <div className="ds-notices__state" role="status">
              <SpinnerGapIcon className="ds-spin" size={28} aria-hidden="true" />
              <p className="ds-notices__state-text">Loading notifications</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="ds-notices__state">
              <span className="ds-notices__state-icon" aria-hidden="true">
                <BellSlashIcon size={24} />
              </span>
              <p className="ds-notices__state-title">No notifications</p>
              <p className="ds-notices__state-text">You are all caught up.</p>
            </div>
          ) : (
            <ul className="ds-notices__list">
              {notifications.map((notification) => (
                <li key={notification._id}>
                  <button
                    type="button"
                    className="ds-notice"
                    data-unread={notification.read ? 'false' : 'true'}
                    onClick={() => openNotification(notification)}
                  >
                    <span className="ds-notice__icon" aria-hidden="true">
                      <BellIcon size={20} />
                    </span>
                    <span className="ds-notice__main">
                      <span className="ds-notice__row">
                        <span className="ds-notice__title">
                          {notification.read ? null : (
                            <>
                              <span className="ds-notice__dot" aria-hidden="true" />
                              <span className="ds-navbar__sr-only">Unread: </span>
                            </>
                          )}
                          {notification.title}
                        </span>
                        <span className="ds-notice__time">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </span>
                      <span className="ds-notice__message">{notification.message}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ds-notices__footer">
          <button
            type="button"
            className="ds-notices__settings"
            onClick={() => {
              setOpen(false);
              navigate('/notification-settings');
            }}
          >
            <GearSixIcon size={18} aria-hidden="true" />
            Notification settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsMenu;
