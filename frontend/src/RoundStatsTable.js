import React from "react";

const RoundStatsTable = ({ data, number_of_question_in_round, nominals }) => {

  if (!data || data.length === 0 || !nominals) {
    return <div></div>; // Return an empty div if data is empty
  }

  const highlightedColumnIndex = number_of_question_in_round;

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

  return data && (
    <table>
      <thead>
        <tr>
          <th>Игрок</th>
          <th>Счет</th>
           {nominals.map((nominal, index) => (
            <th
              key={index}
              className={index === highlightedColumnIndex ? "highlighted" : ""}
            >
              {nominal}
            </th>
          ))}
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
              <td
          key={i}
          className={`${getSymbolClass(cell)} ${i === highlightedColumnIndex ? "highlighted" : ""}`}
        >
          {getSymbol(cell)}
        </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default RoundStatsTable;