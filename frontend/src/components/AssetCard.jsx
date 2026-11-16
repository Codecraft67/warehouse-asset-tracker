import { photoSrc } from "../api";
import { formatDate } from "../format";

export default function AssetCard({ asset, onOpen }) {
  return (
    <button className="card" onClick={() => onOpen(asset.id)} aria-label={`Open record ${asset.asset_id}`}>
      <div className="card-photo">
        {asset.photo_url ? (
          <img src={photoSrc(asset.photo_url)} alt={`Photo of ${asset.asset_id}`} loading="lazy" />
        ) : (
          <span className="no-photo">No photo</span>
        )}
      </div>
      <div className="card-body">
        <span className="tag">{asset.asset_id}</span>
        <span className="card-cat">{asset.category}</span>
        <span className="card-time">{formatDate(asset.created_at)}</span>
      </div>
    </button>
  );
}
