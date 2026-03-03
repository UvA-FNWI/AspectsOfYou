import * as React from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

const palettes = {
  uva: [
    '#bc0031', '#de8098', '#840022',
    '#A8A29F', '#ebb3c1', '#D7D6D4',
  ],
  funky: [
    '#79c9ff', // vivid blue
    '#ffd85c', // vivid yellow
    '#ff6f61', // vivid red
    '#ffa74d', // vivid orange
    '#6fd1a7', // vivid green
    '#b38cf0', // vivid purple
  ],
};

/*
Displays one question as a word cloud
*/

export default function ShowWordCloudQuestion({ question, onTitleChange, readOnly = false, onOpenResponses, colorScheme = 'uva', hideTitle = false }) {
  const [title, setTitle] = React.useState(question.questionText);
  const [isEditing, setIsEditing] = React.useState(false);
  const svgRef = React.useRef();
  const containerRef = React.useRef();
  const [dims, setDims] = React.useState({ width: 0, height: 0 });
  const colors = palettes[colorScheme] || palettes.uva;

  // Track container size so the cloud fills its cell (same pattern as other charts)
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setDims({ width: w, height: h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleBlur = () => {
    if (onTitleChange) {
      onTitleChange(question.questionId, title);
    }
    setIsEditing(false);
  };

  React.useEffect(() => {
    if (!question.answers || question.answers.length === 0) return;
    if (!dims.width || !dims.height) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const inputWords = question.answers.map((answer) => ({
      text: answer.answerText,
      count: parseInt(answer.count, 10)
    }));

    const maxResponses = Math.max(...inputWords.map(w => w.count));
    const totalWords = inputWords.length;

    const width = dims.width;
    // Cap height at width so the cloud is at most square (helps on mobile)
    const height = Math.min(dims.height, dims.width);

    const colorScale = d3.scaleOrdinal(colors);

    // Try placing all words, reducing font scale until they all fit
    function attempt(scaleFactor) {
      const maxFontSize = Math.round(72 * scaleFactor);
      const minFontSize = Math.max(6, Math.round(16 * scaleFactor));
      const fontRange = maxFontSize - minFontSize;

      const words = inputWords.map(w => ({
        ...w,
        size: Math.max(minFontSize, Math.min(maxFontSize, minFontSize + ((w.count / maxResponses) * fontRange))),
      }));

      return new Promise((resolve) => {
        cloud()
          .size([width, height])
          .words(words)
          .padding(4)
          .rotate(() => ~~(Math.random() * 2) * 90)
          .font("Impact")
          .fontSize((d) => d.size)
          .on("end", (placed) => resolve({ placed, scaleFactor }))
          .start();
      });
    }

    // Try progressively smaller fonts until all words fit (max 5 attempts)
    async function run() {
      let scale = 1;
      for (let i = 0; i < 5; i++) {
        const { placed } = await attempt(scale);
        if (placed.length >= totalWords || scale <= 0.3) {
          draw(placed, width, height);
          return;
        }
        scale *= 0.7;
      }
      // Last resort: draw whatever we got
      const { placed } = await attempt(scale);
      draw(placed, width, height);
    }

    function draw(words, w, h) {
      d3.select(svgRef.current).selectAll("*").remove();

      const g = d3.select(svgRef.current)
        .append("g")
        .attr("transform", `translate(${w/2},${h/2})`);

      g.selectAll("text")
        .data(words)
        .enter().append("text")
        .style("font-size", (d) => `${d.size}px`)
        .style("font-family", "Impact")
        .style("fill", (d, i) => colorScale(i))
        .attr("text-anchor", "middle")
        .attr("transform", (d) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text((d) => d.text)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this)
            .style("opacity", 0.7)
            .style("stroke", "#333")
            .style("stroke-width", 1);
        })
        .on("mouseout", function(event, d) {
          d3.select(this)
            .style("opacity", 1)
            .style("stroke", "none");
        })
        .append("title")
        .text((d) => `${d.text}: ${d.count} responses`);
    }

    run();
  }, [question.answers, dims, colors]);

  return (
    <div className="flex flex-col items-center w-full h-full">
      {!hideTitle && (
        readOnly ? (
          <h2 className="text-2xl font-bold mb-4 text-center">{question.questionText}</h2>
        ) : isEditing ? (
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleBlur}
            className="mb-4 text-center font-bold text-2xl border border-gray-300 rounded px-2 py-1"
          />
        ) : (
          <h2
            className="text-2xl font-bold mb-4 text-center"
            onDoubleClick={handleDoubleClick}
          >
            {title}
          </h2>
        )
      )}
      <div
        ref={containerRef}
        className={`w-full flex-1 flex items-center justify-center ${hideTitle ? 'min-h-0 h-full' : 'min-h-[300px]'}`}
      >
        <svg
          ref={svgRef}
          className="cursor-pointer block"
          viewBox={dims.width ? `0 0 ${dims.width} ${Math.min(dims.height, dims.width)}` : undefined}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', maxHeight: '100%' }}
          onClick={() => {
            if (!readOnly && onOpenResponses) {
              onOpenResponses(question);
            }
          }}
        ></svg>
      </div>
    </div>
  );
}