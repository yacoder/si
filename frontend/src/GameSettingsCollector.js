import React, { useState } from 'react';




function GameSettingsCollector({ t, fireSendUpdatedGameSettings, allowSetRoundNumber, setGameSettings, gameSettings }) {
    const [showRoundNameEdits, setShowRoundNameEdits] = useState(false); // Flag to show/hide round name edits

    const handleSetRoundNames = (e) => {
        e.preventDefault();
        const roundNames = e.target.value;
        const newSettings = { ...gameSettings, roundNames };
        if (allowSetRoundNumber) {
            const roundNamesSplit = roundNames.split("\n");
            const numRoundsBasedOnRoundNames = roundNamesSplit.length;
            if (numRoundsBasedOnRoundNames > 1 || roundNamesSplit[0] !== "") {
                newSettings.numRounds = numRoundsBasedOnRoundNames;
            }
        }
        setGameSettings(newSettings);

    }



    return (
        <React.Fragment>
            <input hidden={!allowSetRoundNumber}
                type="text"
                placeholder={t("numberOfRounds")}
                value={gameSettings?.numRounds}
                onChange={(e) => setGameSettings({ ...gameSettings, numRounds: e.target.value })}
            />
            {showRoundNameEdits && (
                <div>
                    <h3>{t("setTopics")}</h3>

                    <textarea
                        placeholder={t("roundNamesPlaceholder")}
                        value={gameSettings?.roundNames}
                        onChange={handleSetRoundNames}
                        rows={5}
                        style={{ width: "100%" }}
                    />
                    <button onClick={(e) => {
                        setShowRoundNameEdits(false);
                        fireSendUpdatedGameSettings(e);
                    }}>{t("setTopics")}</button>
                </div>
            )}
            {!showRoundNameEdits && (
                <button onClick={() => setShowRoundNameEdits(true)}>{t("setTopics")}</button>
            )}
        </React.Fragment>
    )

}
export default GameSettingsCollector;