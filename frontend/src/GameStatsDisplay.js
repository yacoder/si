function GameStatsDisplay({ t, gameStats }) {
    return (
        <div>
            <span>⏳ {t("lag")}: {gameStats?.lag?.toFixed(2)} ms</span>
            <span>🎮 {t("gameToken")}: {gameStats?.game_token}</span>
        </div>
    );
}

export default GameStatsDisplay;