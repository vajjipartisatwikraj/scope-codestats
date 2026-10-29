import React, { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { CopySimpleIcon } from "@phosphor-icons/react/dist/csr/CopySimple";
import { DesktopIcon } from "@phosphor-icons/react/dist/csr/Desktop";
import { Button, Card, TextField } from "../ui";
import "./restrictedNotice.css";

/** Copies text with the clipboard API, or with a hidden text area where that API is not available */
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  document.body.appendChild(area);
  area.select();
  const done = document.execCommand("copy");
  area.remove();
  if (!done) throw new Error("copy failed");
}

/**
 * A page that is limited on small screens (design/screens.md section 19, Restricted routes). It is
 * a full-width card in the page, not a modal: a clear title, why the page is limited, the page
 * address with a button to copy it (to open on a computer) and a way back.
 *
 *   pageName    the name of the page ("Practice Arena")
 *   onBack      called by the back button
 *   backLabel   the back button's text ("Back to dashboard")
 */
export default function RestrictedNotice({ pageName = "This page", onBack, backLabel = "Back to dashboard" }) {
  const [copy, setCopy] = useState("idle"); // idle | copied | failed
  const timer = useRef(0);
  const address = typeof window === "undefined" ? "" : window.location.href;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async () => {
    window.clearTimeout(timer.current);
    try {
      await copyText(address);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
    timer.current = window.setTimeout(() => setCopy("idle"), 4000);
  };

  return (
    <div className="rn">
      <Card className="rn__card">
        <span className="rn__mark" aria-hidden="true">
          <DesktopIcon size={32} weight="regular" />
        </span>

        <h1 className="rn__title">{pageName} works best on a computer</h1>
        <p className="rn__text">
          This page is laid out for a wide screen, with room for editors, previews and tables, so it
          is limited on phones and small tablets. Open it on a laptop or desktop to use it.
        </p>

        <TextField
          className="rn__address"
          label="Page address"
          hint="Send it to yourself, then open it on a computer."
          value={address}
          readOnly
          onFocus={(event) => event.target.select()}
        />

        <div className="rn__actions">
          <Button
            variant="primary"
            startIcon={
              copy === "copied" ? (
                <CheckIcon size={18} weight="bold" aria-hidden="true" />
              ) : (
                <CopySimpleIcon size={18} weight="regular" aria-hidden="true" />
              )
            }
            onClick={onCopy}
          >
            {copy === "copied" ? "Address copied" : "Copy page address"}
          </Button>
          <Button onClick={onBack}>{backLabel}</Button>
        </div>

        <p className="rn__status" role="status">
          {copy === "copied" ? "The page address is on your clipboard." : null}
          {copy === "failed" ? "We could not copy it. Select the address above and copy it by hand." : null}
        </p>
      </Card>
    </div>
  );
}
