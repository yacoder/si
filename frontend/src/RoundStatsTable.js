import React from "react";

const RoundStatsTable = ({ data }) => {
  const getSymbolClass = (value) => {
    if (value === 1) return "plus";
    if (value === -1) return "minus";
    return "dot";
  };

  const getSymbol = (value) => {
    if (value === 1) return "+";
    if (value === -1) return "-";
    return "•"; // Dot character
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Игрок</th>
          <th>Счет</th>
          <th>10</th>
          <th>20</th>
          <th>30</th>
          <th>40</th>
          <th>50</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            <td className="player-name">{row[0]}</td>
            <td className={`score ${row[1] >= 0 ? "positive-score" : "negative-score"}`}>
              {row[1]}
            </td>
            {row.slice(2).map((cell, i) => (
              <td key={i} className={getSymbolClass(cell)}>{getSymbol(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default RoundStatsTable;