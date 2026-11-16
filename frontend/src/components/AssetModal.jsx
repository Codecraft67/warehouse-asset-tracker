import { useEffect, useState } from "react";
import { getAsset, photoSrc, deleteAsset } from "../api";
import { formatFull } from "../format";
import { CloseIcon, TrashIcon } from "./Icons";

export default function AssetModal({ id, onClose, onDeleted }) {
  const [asset, setAsset] = useState(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setAsset(null);
    setError("");
    getAsset(id).then(setAsset).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const remove = async () => {
    try {
      await deleteAsset(id);
      onDeleted(asset.asset_id);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="Asset record" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        {error && <p className="notice error">{error}</p>}
        {!asset && !error && <p className="muted pad">Loading record…</p>}
        {asset && (
          <>
            <div className="modal-photo">
              {asset.photo_url ? (
                <a href={photoSrc(asset.photo_url)} target="_blank" rel="noreferrer" title="Open full-size photo">
                  <img src={photoSrc(asset.photo_url)} alt={`Photo of ${asset.asset_id}`} />
                </a>
              ) : (
                <span className="no-photo">No photo</span>
              )}
            </div>
            <div className="modal-info">
              <span className="tag tag-lg">{asset.asset_id}</span>
              <dl>
                <div><dt>Category</dt><dd>{asset.category}</dd></div>
                <div><dt>Recorded</dt><dd>{formatFull(asset.created_at)}</dd></div>
                <div><dt>Entered by</dt><dd>{asset.source === "manual" ? "Operator (manual entry)" : `Automated: ${asset.source}`}</dd></div>
                <div><dt>Record number</dt><dd>#{asset.id}</dd></div>
              </dl>
              {confirming ? (
                <div className="confirm">
                  <span>Delete this record and its photo?</span>
                  <button className="btn danger" onClick={remove}>Delete record</button>
                  <button className="btn ghost" onClick={() => setConfirming(false)}>Keep it</button>
                </div>
              ) : (
                <button className="btn ghost small" onClick={() => setConfirming(true)}><TrashIcon /> Delete record</button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
