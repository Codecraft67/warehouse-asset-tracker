const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
export const GridIcon = () => (<svg {...base}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>);
export const PlusIcon = () => (<svg {...base}><path d="M12 5v14M5 12h14"/></svg>);
export const SearchIcon = () => (<svg {...base}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>);
export const CameraIcon = () => (<svg {...base} width="28" height="28"><path d="M4 8h3l1.6-2h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/></svg>);
export const CloseIcon = () => (<svg {...base}><path d="m6 6 12 12M18 6 6 18"/></svg>);
export const TrashIcon = () => (<svg {...base}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>);
