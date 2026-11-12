import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" role="img" aria-label="VoidGram">
      <path d="M7 8h15l10 16H17L7 8Z" fill="currentColor" />
      <path d="M7 40 17 24h15L22 40H7Z" fill="currentColor" />
      <path d="m31 8 10 16-10 16-10-16L31 8Z" fill="#777" />
    </svg>
  );
}

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function App() {
  const [device, setDevice] = useState("Устройство не проверено");
  const [ipa, setIpa] = useState("");
  const [log, setLog] = useState("Готово к работе");
  const [busy, setBusy] = useState(false);

  async function detect() {
    setBusy(true);
    try {
      const result = await invoke<string>("detect_devices");
      setDevice(result || "Устройство не найдено");
      setLog(result || "Подключите iPhone и повторите проверку");
    } catch (error) {
      setLog(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function chooseIpa() {
    try {
      const selected = await open({ multiple: false, filters: [{ name: "IPA-файл", extensions: ["ipa"] }] });
      if (typeof selected === "string") setIpa(selected);
    } catch (error) {
      setLog(String(error));
    }
  }

  async function install() {
    if (!ipa) return;
    setBusy(true);
    try {
      setLog(await invoke<string>("install_ipa", { path: ipa }));
    } catch (error) {
      setLog(String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><BrandMark /><span>VOIDGRAM</span></div>
        <div className="topbar-meta"><span className="status-dot" /><span>LOADER</span><span className="meta-divider" /><span>0.4.2</span></div>
      </header>

      <section className="intro">
        <p className="eyebrow">IOS TOOL / WINDOWS</p>
        <h1>Твой iPhone.<br /><span>Твои приложения.</span></h1>
        <p className="intro-copy">Установка IPA-файлов и управление подключённым устройством в одном месте.</p>
      </section>

      <div className="content-grid">
        <section className="panel device-panel">
          <div className="panel-heading">
            <span className="step">01</span>
            <div><p className="eyebrow">ПОДКЛЮЧЕНИЕ</p><h2>Устройство</h2></div>
            <span className="panel-index">DEVICE</span>
          </div>
          <div className="device-state"><span className="state-indicator" /><p>{device}</p></div>
          <button className="button button-light" disabled={busy} onClick={detect}>{busy ? "Проверяем…" : "Найти устройство"}<ArrowIcon /></button>
        </section>

        <section className="panel ipa-panel">
          <div className="panel-heading">
            <span className="step">02</span>
            <div><p className="eyebrow">УСТАНОВКА</p><h2>IPA-файл</h2></div>
            <span className="panel-index">INSTALL</span>
          </div>
          <div className={"file-drop" + (ipa ? " file-selected" : "")}>
            <div className="file-symbol">IPA</div>
            <div className="file-info">
              <strong>{ipa ? ipa.split(/[\\/]/).pop() : "Файл не выбран"}</strong>
              <span>{ipa || "Выбери IPA-файл на компьютере"}</span>
            </div>
            <button className="button button-outline" disabled={busy} onClick={chooseIpa}>Обзор</button>
          </div>
          <button className="button button-light install-button" disabled={!ipa || busy} onClick={install}>{busy ? "Выполняется…" : "Установить приложение"}<ArrowIcon /></button>
        </section>

        <section className="panel log-panel">
          <div className="panel-heading">
            <span className="step">03</span>
            <div><p className="eyebrow">СИСТЕМА</p><h2>Журнал действий</h2></div>
            <span className="live-label"><span className="status-dot" /> LIVE</span>
          </div>
          <pre>{log}</pre>
        </section>
      </div>

      <footer className="footer"><BrandMark /><span>VOIDGRAM LOADER</span><span className="footer-note">Подписание Apple ID пока не реализовано</span></footer>
    </main>
  );
}
