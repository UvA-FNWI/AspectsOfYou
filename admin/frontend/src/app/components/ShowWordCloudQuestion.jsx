import * as React from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

/*
Displays one question as a word cloud
*/

export default function ShowWordCloudQuestion({ question }) {
  const [title, setTitle] = React.useState(question.questionText);
  const [isEditing, setIsEditing] = React.useState(false);
  const svgRef = React.useRef();

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const uvaColors = [
    '#bc0031', '#de8098', '#840022',
    '#A8A29F', '#ebb3c1', '#D7D6D4',
  ];

  React.useEffect(() => {
    if (!question.answers || question.answers.length === 0) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const words = question.answers.map((answer) => ({
      text: answer.answerText,
      count: parseInt(answer.count, 10)
    }));

    const maxResponses = Math.max(...words.map(w => w.count));
    const totalResponses = words.reduce((sum, w) => sum + w.count, 0);

    const maxFontSize = 72;
    const minFontSize = 16;

    // dynamic styling
    words.forEach(word => {
      const relativeSize = word.count / maxResponses;
      word.size = Math.max(minFontSize, Math.min(maxFontSize, minFontSize + (relativeSize * 32)));
    });

    const width = 400;
    const height = 300;

    const colorScale = d3.scaleOrdinal(uvaColors);

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
  }, [question.answers]);

  console.log(question.answers);

  return (
    <div className="flex flex-col items-center">
      {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleBlur}
            className="mb-4 text-center font-bold border border-gray-300 rounded px-2 py-1"
          />
        ) : (
          <h2
            className="text-2xl mb-4 text-center"
            onDoubleClick={handleDoubleClick}
          >
            {title}
          </h2>
        )}
      <svg ref={svgRef} className="border border-gray-200 rounded-lg shadow-sm"></svg>
    </div>
  );
}