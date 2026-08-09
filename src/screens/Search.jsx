import { useEffect, useState } from "react";
import { getAllStats, searchLocal, getMemes, getTrending } from "../engine/market.js";
import { TokenRow, Segmented, Empty } from "../ui/Common.jsx";
import { IcBack, IcSearch } from "../ui/Icons.jsx";

const BOARDS = [
  { value: "all", label: "Top 100" },
  { value: "trending", label: "Trending" },
  { value: "meme", label: "Memes" },
];

export default function Search({ nav, back }) {
  const [q, setQ] = useState("");
  const [board, setBoard] = useState("all");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 220);
    return () => clearTimeout(t);
  }, [q]);

  let list;
  if (debounced.trim()) {
    list = searchLocal(debounced);
  } else if (board === "trending") {
    list = getTrending();
  } else if (board === "meme") {
    list = getMemes();
  } else {
    list = getAllStats();
  }

  return (
    <>
      <div className="appbar">
        <button onClick={back} aria-label="Back">
          <IcBack size={24} />
        </button>
        <div
          className="row gap8 grow"
          style={{ background: "var(--surface-2)", borderRadius: 14, padding: "0 12px", height: 42 }}
        >
          <span className="muted">
            <IcSearch size={18} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search coins"
            autoFocus
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 16,
              fontWeight: 500,
              minWidth: 0,
            }}
          />
        </div>
      </div>

      {!debounced.trim() && (
        <div className="pad" style={{ paddingBottom: 8 }}>
          <Segmented options={BOARDS} value={board} onChange={setBoard} />
        </div>
      )}

      <div className="scroll">
        {list.length === 0 ? (
          <Empty
            icon="🔍"
            title={debounced ? "No coins found" : "Loading market"}
            body={debounced ? `Nothing matching "${debounced}"` : "Fetching live prices…"}
          />
        ) : (
          list.map((s) => (
            <TokenRow
              key={s.id}
              stat={s}
              onClick={() => nav("token", { tokenId: s.id })}
              showHolders={false}
            />
          ))
        )}
      </div>
    </>
  );
}
