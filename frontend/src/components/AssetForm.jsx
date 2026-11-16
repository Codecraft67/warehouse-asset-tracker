import { useEffect, useRef, useState } from "react";
import { createAsset } from "../api";
import { CameraIcon } from "./Icons";

const MAX_MB = 8;

export default function AssetForm({ categories, onSaved }) {
  const [assetId, setAssetId] = useState("");
  const [category, setCategory] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  const fileRef = useRef(null);

  // live clock: shows the operator that time is recorded automatically
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const choosePhoto = (file) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file (JPG, PNG, WEBP or GIF).");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Photo is larger than ${MAX_MB} MB. Choose a smaller one.`);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!assetId.trim()) return setError("Enter the asset ID.");
    if (!category.trim()) return setError("Choose or type a category.");
    if (!photo) return setError("Add a photograph of the asset.");
    setBusy(true);
    try {
      const saved = await createAsset({ assetId, category, photo });
      setAssetId(""); setCategory(""); setPhoto(null); setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel form" onSubmit={submit} noValidate>
      <h2>Log a new asset</h2>
      <p className="muted">Date and time are added automatically when you save.</p>

      <label className="field">
        <span>Asset ID</span>
        <input value={assetId} onChange={(e) => setAssetId(e.target.value)} placeholder="e.g. PLT-00417" autoComplete="off" autoCapitalize="characters" maxLength={64} />
      </label>

      <label className="field">
        <span>Category</span>
        <input value={category} onChange={(e) => setCategory(e.target.value)} list="category-list" placeholder="Pick one or type a new one" maxLength={64} />
        <datalist id="category-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </label>

      <div className="field">
        <span>Photograph</span>
        <label
          className={`drop ${preview ? "has-photo" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); choosePhoto(e.dataTransfer.files?.[0]); }}
        >
          {preview ? (
            <img src={preview} alt="Selected asset preview" />
          ) : (
            <span className="drop-hint"><CameraIcon /><b>Take or choose a photo</b><small>JPG, PNG, WEBP or GIF, up to {MAX_MB} MB</small></span>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => choosePhoto(e.target.files?.[0])} />
        </label>
        {preview && <button type="button" className="link-btn" onClick={() => fileRef.current?.click()}>Replace photo</button>}
      </div>

      {error && <p className="notice error" role="alert">{error}</p>}

      <div className="form-foot">
        <span className="clock" aria-live="off">{now.toLocaleString([], { dateStyle: "medium", timeStyle: "medium" })}</span>
        <button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save asset"}</button>
      </div>
    </form>
  );
}
