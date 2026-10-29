import React from "react";
import { PillTabs } from "../../../custom-components";

/**
 * The tab strip of an open question (custom PillTabs, one sliding highlight). `tabs` is
 * [{ key, label }]. `idPrefix` makes tab and panel ids pair up ("<prefix>-tab-<key>" and
 * "<prefix>-panel-<key>"), so the panel can name itself by its tab.
 */
const QuestionTabs = ({ tabs, value, onChange, idPrefix, label = "Question analysis" }) => (
  <div className="sxe-qtabs">
    <PillTabs items={tabs} value={value} onChange={onChange} label={label} idPrefix={idPrefix} />
  </div>
);

export default QuestionTabs;
