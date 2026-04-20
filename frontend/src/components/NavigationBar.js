import React from "react";

function NavigationBar({ scenes, currentScene, character, onSceneChange, activeTab, onTabChange, onGoHome }) {

  // 外出场景：排除锦绣阁（bedroom），添加云锦坊
  const outsideScenes = [
    ...(scenes || []).filter(scene => scene.id !== 'bedroom' && scene.name !== '锦绣阁' && scene.id !== 'desert_oasis'),
    { id: 'shop', name: '云锦坊', icon: '🏮', unlocked: true }
  ];

  // 点击锦绣阁：调用父组件的 onGoHome，切到 bedroom + room tab
  const handleGoHome = () => {
    if (onGoHome) onGoHome();
  };

  // 点击外出场景
  const handleOutsideScene = (scene) => {
    if (scene.id === 'shop') {
      // 云锦坊：切换到商铺tab
      if (onTabChange) onTabChange('shop');
    } else {
      onSceneChange(scene.id);
    }
  };

  const isSceneActive = (scene) => {
    if (scene.id === 'shop') return activeTab === 'shop';
    return currentScene === scene.id && activeTab === 'outdoor';
  };

  const styles = {
    container: {
      width: "200px",
      backgroundColor: "rgba(15, 5, 10, 0.82)",
      borderRadius: "14px",
      padding: "16px 12px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(201,168,76,0.15)",
      border: "1px solid rgba(201,168,76,0.22)",
      backdropFilter: "blur(12px)",
    },
    sectionTitle: {
      fontSize: "11px",
      fontWeight: "700",
      color: "rgba(201,168,76,0.65)",
      marginBottom: "8px",
      paddingBottom: "5px",
      borderBottom: "1px solid rgba(201,168,76,0.18)",
      letterSpacing: "3px",
      textTransform: "uppercase",
    },
    navList: {
      listStyle: "none",
      padding: 0,
      margin: 0,
    },
    navItem: {
      padding: "9px 12px",
      marginBottom: "4px",
      borderRadius: "9px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "13px",
    },
    navItemActive: {
      backgroundColor: "rgba(201,168,76,0.18)",
      color: "rgba(255,220,150,0.95)",
      fontWeight: "700",
      border: "1px solid rgba(201,168,76,0.35)",
    },
    navItemInactive: {
      backgroundColor: "transparent",
      color: "rgba(230,200,170,0.55)",
      fontWeight: "500",
      border: "1px solid transparent",
    },
    homeButton: {
      width: "100%",
      padding: "10px 12px",
      marginTop: "12px",
      background: "linear-gradient(135deg, rgba(180,60,90,0.75), rgba(130,35,65,0.75))",
      border: "1px solid rgba(212,81,122,0.35)",
      borderRadius: "10px",
      color: "rgba(255,200,210,0.9)",
      fontSize: "13px",
      fontWeight: "700",
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "7px",
      letterSpacing: "2px",
      backdropFilter: "blur(4px)",
    },
  };

  return (
    <div style={styles.container}>
      {/* 外出场景 */}
      <div style={styles.sectionTitle}>外出</div>
      <ul style={styles.navList}>
        {outsideScenes.map(scene => (
          <li
            key={scene.id}
            style={{
              ...styles.navItem,
              ...(isSceneActive(scene) ? styles.navItemActive : styles.navItemInactive),
            }}
            onClick={() => handleOutsideScene(scene)}
          >
            <span style={{ fontSize: "15px" }}>{scene.icon || "📍"}</span>
            <span>{scene.name}</span>
          </li>
        ))}
      </ul>

      {/* 锦绣阁回家按钮 */}
      <button
        style={styles.homeButton}
        onClick={handleGoHome}
        onMouseEnter={e => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(212,81,122,0.88), rgba(160,48,88,0.88))";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(180,60,90,0.75), rgba(130,35,65,0.75))";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <span>🪟</span>
        <span>锦绣阁</span>
      </button>
    </div>
  );
}

export default NavigationBar;
