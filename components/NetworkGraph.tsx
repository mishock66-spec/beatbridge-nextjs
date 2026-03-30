"use client";

import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import type { NetworkContact } from "@/lib/mutualContacts";

// ─── Types ─────────────────────────────────────────────────────────────────────

type GraphNode = d3.SimulationNodeDatum & {
  id: string;
  type: "artist" | "contact";
  label: string;
  username: string;
  profileType: string;
  followers: number;
  isMutual: boolean;
  radius: number;
  artistConnections: string[];
};

type GraphLink = d3.SimulationLinkDatum<GraphNode> & {
  isMutual: boolean;
  artistId: string;
};

type TooltipData = {
  x: number;
  y: number;
  username: string;
  profileType: string;
  followers: number;
  isMutual: boolean;
  artistConnections: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  Producer: "#f97316",
  "Sound Engineer": "#3b82f6",
  "Artist/Rapper": "#a855f7",
  Manager: "#22c55e",
  "Photographer/Videographer": "#ec4899",
  Other: "#6b7280",
};

const ARTIST_COLOR = "#f97316";
const ARTIST_RADIUS = 26;

function contactRadius(followers: number): number {
  return Math.max(4, Math.min(16, 4 + (followers / 800_000) * 12));
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  contacts: NetworkContact[];
  artistNames: string[];
}

export default function NetworkGraph({ contacts, artistNames }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Build graph data
  function buildGraph(width: number, height: number): { nodes: GraphNode[]; links: GraphLink[] } {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Artist nodes — spread around center
    const cx = width / 2;
    const cy = height / 2;
    const spread = Math.min(width, height) * 0.28;
    const artistPositions = artistNames.map((_, i) => {
      const angle = (i / artistNames.length) * 2 * Math.PI - Math.PI / 2;
      return { x: cx + spread * Math.cos(angle), y: cy + spread * Math.sin(angle) };
    });

    artistNames.forEach((name, i) => {
      nodes.push({
        id: `artist::${name}`,
        type: "artist",
        label: name,
        username: name,
        profileType: "Artist",
        followers: 0,
        isMutual: false,
        radius: ARTIST_RADIUS,
        artistConnections: [name],
        x: artistPositions[i].x,
        y: artistPositions[i].y,
      });
    });

    // Contact nodes — capped at 200 by follower count
    const topContacts = contacts.slice(0, 200);

    topContacts.forEach((c) => {
      const validArtists = c.artists.filter((a) => artistNames.includes(a));
      if (validArtists.length === 0) return;

      nodes.push({
        id: `contact::${c.username}`,
        type: "contact",
        label: c.username,
        username: c.username,
        profileType: c.profileType,
        followers: c.followers,
        isMutual: c.isMutual,
        radius: contactRadius(c.followers),
        artistConnections: validArtists,
      });

      validArtists.forEach((artistName) => {
        links.push({
          source: `artist::${artistName}`,
          target: `contact::${c.username}`,
          isMutual: c.isMutual,
          artistId: `artist::${artistName}`,
        });
      });
    });

    return { nodes, links };
  }

  // D3 initialization
  useEffect(() => {
    if (isMobile || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 650;

    svg.selectAll("*").remove();
    selectedRef.current = null;

    const { nodes, links } = buildGraph(width, height);

    // ── Defs: glow filter ──
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow-artist").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filter.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "5").attr("result", "blur");
    const merge = filter.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // ── Background ──
    svg.append("rect").attr("width", width).attr("height", height).attr("fill", "#0a0a0a");

    // ── Zoom container ──
    const g = svg.append("g").attr("class", "zoom-container");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);
    svg.on("dblclick.zoom", null); // disable double-click zoom

    // ── Links ──
    const link = g.append("g").attr("class", "links")
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => d.isMutual ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.07)")
      .attr("stroke-width", (d) => d.isMutual ? 1.5 : 0.5)
      .attr("stroke-linecap", "round");

    // ── Node groups ──
    const nodeGroup = g.append("g").attr("class", "nodes")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", (d) => d.type === "contact" ? "pointer" : "grab");

    // Circles
    nodeGroup.append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => {
        if (d.type === "artist") return ARTIST_COLOR;
        return TYPE_COLORS[d.profileType] ?? "#6b7280";
      })
      .attr("filter", (d) => d.type === "artist" ? "url(#glow-artist)" : null)
      .attr("stroke", (d) => {
        if (d.type === "artist") return "rgba(249,115,22,0.4)";
        if (d.isMutual) return "rgba(255,255,255,0.35)";
        return "none";
      })
      .attr("stroke-width", (d) => d.type === "artist" ? 3 : 1.5);

    // Artist labels
    nodeGroup.filter((d) => d.type === "artist")
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius + 16)
      .attr("fill", "#ffffff")
      .attr("font-size", "12px")
      .attr("font-weight", "700")
      .attr("font-family", "system-ui, -apple-system, sans-serif")
      .attr("letter-spacing", "0.03em")
      .attr("pointer-events", "none");

    // ── Drag ──
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(drag as unknown as (sel: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>) => void);

    // ── Hover tooltip ──
    nodeGroup
      .on("mouseover", (event: MouseEvent, d: GraphNode) => {
        if (d.type === "contact") {
          setTooltip({
            x: event.clientX,
            y: event.clientY,
            username: d.username,
            profileType: d.profileType,
            followers: d.followers,
            isMutual: d.isMutual,
            artistConnections: d.artistConnections,
          });
        }
      })
      .on("mousemove", (event: MouseEvent) => {
        setTooltip((prev) => prev ? { ...prev, x: event.clientX, y: event.clientY } : null);
      })
      .on("mouseout", () => setTooltip(null));

    // ── Click ──
    nodeGroup.on("click", (event: MouseEvent, d: GraphNode) => {
      event.stopPropagation();

      if (d.type === "contact") {
        window.open(`https://instagram.com/${d.username}`, "_blank", "noopener,noreferrer");
        return;
      }

      // Artist click: toggle filter
      const prev = selectedRef.current;
      const next = prev === d.id ? null : d.id;
      selectedRef.current = next;
      setSelectedArtist(next);

      if (next) {
        const artistName = d.username;
        nodeGroup.select("circle")
          .transition().duration(200)
          .attr("opacity", (n: GraphNode) => {
            if (n.id === next) return 1;
            if (n.type === "contact" && n.artistConnections.includes(artistName)) return 1;
            return 0.08;
          });
        nodeGroup.select("text")
          .transition().duration(200)
          .attr("opacity", (n: GraphNode) => (n.id === next ? 1 : 0.08));
        link
          .transition().duration(200)
          .attr("opacity", (l: GraphLink) => {
            const src = typeof l.source === "object" ? (l.source as GraphNode).id : l.source;
            return src === next ? 1 : 0.03;
          });
      } else {
        nodeGroup.select("circle").transition().duration(200).attr("opacity", 1);
        nodeGroup.select("text").transition().duration(200).attr("opacity", 1);
        link.transition().duration(200).attr("opacity", 1);
      }
    });

    // Click background to deselect
    svg.on("click", () => {
      if (!selectedRef.current) return;
      selectedRef.current = null;
      setSelectedArtist(null);
      nodeGroup.select("circle").transition().duration(200).attr("opacity", 1);
      nodeGroup.select("text").transition().duration(200).attr("opacity", 1);
      link.transition().duration(200).attr("opacity", 1);
    });

    // ── Simulation ──
    const sim = d3.forceSimulation<GraphNode, GraphLink>(nodes)
      .force(
        "link",
        d3.forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => {
            const target = typeof d.target === "object" ? (d.target as GraphNode) : null;
            return target?.isMutual ? 110 : 85;
          })
          .strength(0.4)
      )
      .force("charge", d3.forceManyBody<GraphNode>().strength((d) => d.type === "artist" ? -600 : -60))
      .force("center", d3.forceCenter<GraphNode>(width / 2, height / 2).strength(0.05))
      .force("collide", d3.forceCollide<GraphNode>().radius((d) => d.radius + 3).strength(0.7));

    sim.on("tick", () => {
      link
        .attr("x1", (d) => ((d.source as GraphNode).x ?? 0))
        .attr("y1", (d) => ((d.source as GraphNode).y ?? 0))
        .attr("x2", (d) => ((d.target as GraphNode).x ?? 0))
        .attr("y2", (d) => ((d.target as GraphNode).y ?? 0));

      nodeGroup.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    simRef.current = sim;

    return () => {
      sim.stop();
      svg.selectAll("*").remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, artistNames, isMobile]);

  // Reset handler
  function handleReset() {
    selectedRef.current = null;
    setSelectedArtist(null);
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.selectAll("circle").transition().duration(200).attr("opacity", 1);
      svg.selectAll("text").transition().duration(200).attr("opacity", 1);
      svg.selectAll("line").transition().duration(200).attr("opacity", 1);
    }
    simRef.current?.alpha(0.2).restart();
  }

  // ── Mobile fallback ──
  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
        <div className="text-5xl">🕸️</div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Network Chain</h2>
          <p className="text-[#a0a0a0] text-sm leading-relaxed max-w-xs">
            The interactive network graph is best experienced on a desktop or tablet.
            Open BeatBridge on a larger screen to explore artist connections.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-[#606060]">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              {type}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Desktop graph ──
  return (
    <div className="relative w-full h-full" style={{ background: "#0a0a0a" }}>
      <svg ref={svgRef} className="w-full h-full" />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed pointer-events-none bg-[#181818] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs shadow-2xl z-50 min-w-[140px]"
          style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}
        >
          <p className="font-semibold text-white">@{tooltip.username}</p>
          <p className="text-[#a0a0a0] mt-0.5">{tooltip.profileType}</p>
          {tooltip.followers > 0 && (
            <p className="text-[#606060] mt-0.5">{formatFollowers(tooltip.followers)} followers</p>
          )}
          {tooltip.isMutual && (
            <p className="text-orange-400 font-medium mt-1">
              In {tooltip.artistConnections.length} networks
            </p>
          )}
        </div>
      )}

      {/* Reset button */}
      {selectedArtist && (
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 text-xs font-semibold bg-white/[0.07] hover:bg-white/[0.14] border border-white/[0.12] text-white px-3.5 py-1.5 rounded-lg transition-colors"
        >
          Reset view
        </button>
      )}

      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-[#484848] bg-black/60 px-3.5 py-1.5 rounded-full border border-white/[0.05] whitespace-nowrap select-none">
        Drag · Scroll to zoom · Click artist to filter · Click contact to open Instagram
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-5 bg-black/70 backdrop-blur-sm border border-white/[0.07] rounded-xl px-3.5 py-3 text-[11px] space-y-1.5">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[#808080]">{type}</span>
          </div>
        ))}
        <div className="pt-1.5 mt-0.5 border-t border-white/[0.06] space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/50 bg-transparent" />
            <span className="text-[#808080]">Mutual contact</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: ARTIST_COLOR }} />
            <span className="text-[#808080]">Artist</span>
          </div>
        </div>
      </div>

      {/* Node count */}
      <div className="absolute bottom-6 right-5 text-[11px] text-[#383838] select-none">
        {Math.min(contacts.length, 200) + artistNames.length} nodes · {contacts.length > 200 ? "top 200 by followers" : "all contacts"}
      </div>
    </div>
  );
}
