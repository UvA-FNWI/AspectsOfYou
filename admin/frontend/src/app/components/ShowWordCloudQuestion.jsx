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

export default function ShowWordCloudQuestion({ question, onTitleChange, readOnly = false, onOpenResponses, colorScheme = 'uva', hideTitle = false, chartFontSize }) {
  const [title, setTitle] = React.useState(question.questionText);
  const [isEditing, setIsEditing] = React.useState(false);
  const svgRef = React.useRef();
  const containerRef = React.useRef();
  const [dims, setDims] = React.useState({ width: 0, height: 0 });
  const colors = palettes[colorScheme] || palettes.uva;

  // Track container size so the cloud fills its cell
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

    const words = question.answers.map((answer) => ({
      text: answer.answerText,
      count: parseInt(answer.count, 10)
    }));

    const maxResponses = Math.max(...words.map(w => w.count));

    const maxFontSize = chartFontSize ? Math.round(72 * chartFontSize / 13) : 72;
    const minFontSize = chartFontSize ? Math.round(16 * chartFontSize / 13) : 16;

    // dynamic styling
    words.forEach(word => {
      const relativeSize = word.count / maxResponses;
      word.size = Math.max(minFontSize, Math.min(maxFontSize, minFontSize + (relativeSize * 32)));
    });

    const width = dims.width;
    const height = dims.height;

    const colorScale = d3.scaleOrdinal(colors);

    const layout = cloud()
      .size([width, height])
      .words(words)
      .padding(5)
      .rotate(() => ~~(Math.random() * 2) * 90)
      .font("Impact")
      .fontSize((d) => d.size)
      .on("end", draw);

    layout.start();

    function draw(words) {
      d3.select(svgRef.current).selectAll("*").remove();
      const svg = d3.select(svgRef.current)
        .attr("width", width)
        .attr("height", height);

      const g = svg.append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

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
        className={`w-full flex-1 ${hideTitle ? 'min-h-0 h-full' : 'min-h-[200px]'}`}
      >
        <svg
          ref={svgRef}
          className="cursor-pointer block"
          style={{ width: dims.width || '100%', height: dims.height || '100%' }}
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