import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

type Page = "device" | "apple" | "tools" | "settings";
type ReleaseInfo = { version: string; title: string; pageUrl: string; publishedAt: string; ipaName: string; ipaSize: number; sha256: string | null; requiresSigning: boolean };
type DownloadedIpa = { version: string; path: string; size: number; sha256: string; requiresSigning: boolean };

export default function App() {
  const [page, setPage] = useState<Page>("device");
  const [device, setDevice] = useState<string | null>(null);
  const [deviceState, setDeviceState] = useState<"idle" | "connected" | "missing" | "error">("idle");
  const [ipa, setIpa] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Готово к работе");
  const [appleEmail, setAppleEmail] = useState("");
  const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null>(null);
  const [downloadedVersion, setDownloadedVersion] = useState("");
  const [requiresSigning, setRequiresSigning] = useState(false);

  async function detect() {
    setBusy(true);
    setNotice("Проверяем подключение…");
    try {
      const result = await invoke<string>("detect_devices");
      if (!result.trim()) {
        setDevice(null);
        setDeviceState("missing");
        setNotice("iPhone или iPad не найден");
      } else {
        setDevice(result.trim());
        setDeviceState("connected");
        setNotice("Устройство обнаружено");
      }
    } catch (error) {
      setDeviceState("error");
      setNotice(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function chooseIpa() {
    try {
      const selected = await open({ multiple: false, filters: [{ name: "IPA", extensions: ["ipa"] }] });
      if (typeof selected === "string") { setIpa(selected); setRequiresSigning(false); setDownloadedVersion("Выбранный IPA"); }
    } catch (error) {
      setNotice(String(error));
    }
  }

  async function checkLatestRelease() {
    try {
      const release = await invoke<ReleaseInfo>("latest_voidgram_release");
      setLatestRelease(release);
      setNotice(`Найдена версия VoidGram ${release.version}`);
    } catch (error) {
      setNotice(`Не удалось проверить обновление: ${String(error)}`);
    }
  }

  async function downloadLatestIpa() {
    setBusy(true);
    setNotice("Загружаем последнюю версию VoidGram…");
    try {
      const result = await invoke<DownloadedIpa>("download_latest_voidgram_ipa");
      setIpa(result.path);
      setDownloadedVersion(result.version);
      setRequiresSigning(result.requiresSigning);
      setNotice(result.requiresSigning
        ? `VoidGram ${result.version} загружен и проверен. IPA неподписан — перед установкой нужна подпись.`
        : `VoidGram ${result.version} загружен и проверен по SHA-256.`);
    } catch (error) {
      setNotice(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function installIpa() {
    if (!ipa) return;
    if (requiresSigning) {
      setNotice("Этот IPA неподписан. Сначала нужно реализовать безопасную подпись Apple.");
      return;
    }
    setBusy(true);
    setNotice("Установка IPA…");
    try {
      const result = await invoke<string>("install_ipa", { path: ipa });
      setNotice(result || "Команда установки завершена");
    } catch (error) {
      setNotice(String(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void checkLatestRelease(); }, []);

  const nav = [
    { id: "device" as const, label: "Устройство", icon: "▣" },
    { id: "apple" as const, label: "Apple ID", icon: "♙" },
    { id: "tools" as const, label: "Инструменты", icon: "⌘" },
    { id: "settings" as const, label: "Настройки", icon: "⚙" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div><div className="brand-name">VoidGram</div><div className="brand-caption">LOADER</div></div>
        </div>
        <div className="nav-caption">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav>
          {nav.map(item => <button key={item.id} className={page === item.id ? "nav-item active" : "nav-item"} onClick={() => setPage(item.id)}>
            <span className="nav-icon">{item.icon}</span>{item.label}
          </button>)}
        </nav>
        <div className="sidebar-bottom">
          <span className="ready-dot" />
          <div><strong>Готово к работе</strong><small>VoidGram Loader · 0.4.0</small></div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div><div className="eyebrow">VOIDGRAM LOADER</div><h1>{nav.find(item => item.id === page)?.label}</h1></div>
          <div className="top-status"><span className="ready-dot" />Готово к работе</div>
        </header>

        {page === "device" && <div className="page-content">
          <section className="section-heading"><div><h2>Устройство</h2><p>Подключите iPhone или iPad к компьютеру по USB</p></div>
            <button className="button button-secondary" onClick={detect} disabled={busy}>↻ Обновить информацию</button>
          </section>
          <section className="card device-card">
            <div className="device-visual">▯</div>
            <div className="device-info"><h3>{device ? "Устройство обнаружено" : "iPhone или iPad"}</h3><p>{device || "Подключите устройство кабелем USB и нажмите «Обновить информацию»."}</p>
              <div className="connection"><span className={`state-dot ${deviceState}`} /><span>Состояние: {deviceState === "connected" ? "Подключено" : deviceState === "error" ? "Ошибка подключения" : deviceState === "missing" ? "Не подключено" : "Не проверено"}</span></div>
            </div>
            <button className="button button-primary" onClick={detect} disabled={busy}>{busy ? "Проверка…" : "Подключить"}</button>
          </section>
          <button className="info-link" onClick={() => setNotice("Сведения появятся после обнаружения устройства.")}>ⓘ Сведения об устройстве</button>

          <section className="section-heading tools-heading"><div><h2>Основные инструменты</h2><p>Управление учётной записью и установкой приложений</p></div></section>
          <section className="card apple-card">
            <div className="person-icon">♙</div><div className="apple-copy"><h3>Apple ID</h3><p>{appleEmail ? appleEmail : "Войдите в Apple ID для работы с подписыванием приложений."}</p></div>
            <button className="button button-secondary" onClick={() => setPage("apple")}>{appleEmail ? "Обновить Apple ID" : "Войти в Apple ID"}</button>
          </section>
          <section className="install-card">
            <div className="install-copy"><div className="install-icon">V</div><div><div className="install-title">Установка VoidGram</div><p>Неофициальный мессенджер VoidGram от команды разработчиков VoidDev</p><p className="release-meta">{latestRelease ? `Последняя версия: ${latestRelease.version} · ${(latestRelease.ipaSize / 1024 / 1024).toFixed(1)} МБ` : "Проверяем последнюю версию…"}</p></div></div>
            <div className="install-actions">
              <button className="button button-secondary" onClick={checkLatestRelease} disabled={busy}>Проверить</button>
              <button className="button button-light" onClick={downloadLatestIpa} disabled={busy || !latestRelease}>{busy ? "Подождите…" : "Скачать актуальную IPA"}</button>
            </div>
          </section>
          {downloadedVersion && <section className="card release-result"><div><strong>VoidGram {downloadedVersion}</strong><p>{requiresSigning ? "Файл скачан и проверен. Релиз разработчика опубликован как неподписанный IPA; установка на iPhone пока заблокирована до реализации подписи." : "Файл подготовлен к установке."}</p></div><button className="button button-primary" onClick={installIpa} disabled={busy || requiresSigning || !ipa}>Установить</button></section>}
        </div>}

        {page === "apple" && <div className="page-content narrow">
          <section className="section-heading"><div><h2>Apple ID</h2><p>Управление учётной записью Apple</p></div></section>
          <section className="card form-card"><div className="person-icon large">♙</div><h3>{appleEmail ? "Учётная запись" : "Войти в Apple ID"}</h3><p>Авторизация будет подключена через безопасный официальный механизм. Не вводите пароль на сторонних страницах.</p>
            <label>Apple ID (электронная почта)</label><input value={appleEmail} onChange={e => setAppleEmail(e.target.value)} placeholder="name@example.com" />
            <button className="button button-primary" onClick={() => setNotice("Для входа требуется реализовать официальный поток авторизации Apple.")}>Продолжить</button>
            <small className="muted">Пароль и коды подтверждения приложение здесь не запрашивает.</small>
          </section>
        </div>}

        {page === "tools" && <div className="page-content">
          <section className="section-heading"><div><h2>Инструменты</h2><p>Установка и обслуживание приложений</p></div></section>
          <section className="card form-card"><h3>Установка IPA</h3><p>Выберите IPA-файл для установки на подключённое устройство.</p>
            <div className="file-row"><input readOnly value={ipa} placeholder="Файл не выбран" /><button className="button button-secondary" onClick={chooseIpa}>Обзор</button></div>
            <button className="button button-primary" disabled={!ipa || busy || deviceState !== "connected"} onClick={installIpa}>{busy ? "Установка…" : "Установить IPA"}</button>
            {deviceState !== "connected" && <small className="muted">Сначала подключите устройство.</small>}
          </section>
        </div>}

        {page === "settings" && <div className="page-content narrow">
          <section className="section-heading"><div><h2>Настройки</h2><p>Параметры приложения</p></div></section>
          <section className="card setting-row"><div><h3>Язык интерфейса</h3><p>Русский</p></div><span className="muted">RU</span></section>
          <section className="card setting-row"><div><h3>Версия приложения</h3><p>VoidGram Loader</p></div><span className="muted">0.4.0</span></section>
        </div>}
        <footer className="statusbar"><span className="ready-dot" />{notice}</footer>
      </main>
    </div>
  );
}
