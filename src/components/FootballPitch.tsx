import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../theme';
import type { TeamLineup, LineupPlayer } from '../api';

type Props = {
  homeLineup: TeamLineup;
  awayLineup: TeamLineup;
};

const PITCH_RATIO = 1.5; // height / width
const SCREEN_WIDTH = Dimensions.get('window').width;
const PITCH_WIDTH = SCREEN_WIDTH - 32; // 16px margin each side
const PITCH_HEIGHT = PITCH_WIDTH * PITCH_RATIO;
const HALF_HEIGHT = PITCH_HEIGHT / 2;

// Jersey component
function Jersey({ player, color, textColor }: { player: LineupPlayer; color: string; textColor: string }) {
  return (
    <View style={jerseyStyles.container}>
      {player.photo ? (
        <Image source={{ uri: player.photo }} style={jerseyStyles.photo} />
      ) : (
        <View style={[jerseyStyles.circle, { backgroundColor: color }]}>
          <Text style={[jerseyStyles.number, { color: textColor }]}>{player.number}</Text>
        </View>
      )}
      <Text style={jerseyStyles.name} numberOfLines={1}>{player.name.split(' ').pop()}</Text>
    </View>
  );
}

const jerseyStyles = StyleSheet.create({
  container: { alignItems: 'center', width: 56 },
  circle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  photo: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  number: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, lineHeight: 17 },
  name: {
    fontFamily: 'Inter_600SemiBold', fontSize: 8, color: '#fff',
    marginTop: 2, textAlign: 'center', letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
});

/**
 * Parse the "row:col" grid string and map to x,y positions on the pitch.
 * Grid format from API: "row:col" where row 1 = goalkeeper, higher rows = further up.
 * Home team plays top half (attacking downward visually), away plays bottom half.
 */
function getPlayerPosition(
  grid: string | null,
  isHome: boolean,
  totalRows: number,
): { x: number; y: number } | null {
  if (!grid) return null;
  const [rowStr, colStr] = grid.split(':');
  const row = parseInt(rowStr, 10);
  const col = parseInt(colStr, 10);
  if (isNaN(row) || isNaN(col)) return null;

  // Count how many players in this row to center them
  // We'll handle this externally — here just return normalized coords

  return { x: col, y: row };
}

function groupByRow(players: LineupPlayer[]): Map<number, LineupPlayer[]> {
  const rows = new Map<number, LineupPlayer[]>();
  for (const p of players) {
    if (!p.grid) continue;
    const row = parseInt(p.grid.split(':')[0], 10);
    if (isNaN(row)) continue;
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)!.push(p);
  }
  return rows;
}

function renderTeamOnPitch(
  lineup: TeamLineup,
  isHome: boolean,
  halfHeight: number,
  pitchWidth: number,
) {
  const rows = groupByRow(lineup.startXI);
  const totalRows = rows.size;
  const sortedRowKeys = [...rows.keys()].sort((a, b) => a - b);

  const jerseyColor = isHome ? '#1E40AF' : '#DC2626'; // blue vs red
  const textColor = '#fff';

  const elements: React.ReactNode[] = [];

  sortedRowKeys.forEach((rowKey, rowIndex) => {
    const playersInRow = rows.get(rowKey)!;
    // Sort by col
    playersInRow.sort((a, b) => {
      const colA = parseInt(a.grid!.split(':')[1], 10);
      const colB = parseInt(b.grid!.split(':')[1], 10);
      return colA - colB;
    });

    const numCols = playersInRow.length;
    // Y position: distribute rows evenly within the half
    const yPadding = 16;
    const availableHeight = halfHeight - yPadding * 2;
    let yPos: number;
    if (isHome) {
      // Home on top: row 1 (GK) at top, last row near middle
      yPos = yPadding + (rowIndex / Math.max(totalRows - 1, 1)) * availableHeight;
    } else {
      // Away on bottom: row 1 (GK) at bottom, last row near middle
      yPos = halfHeight - yPadding - (rowIndex / Math.max(totalRows - 1, 1)) * availableHeight;
    }

    playersInRow.forEach((player, colIndex) => {
      // X position: distribute evenly across width
      const xPadding = 28;
      const availableWidth = pitchWidth - xPadding * 2;
      const xPos = xPadding + ((colIndex + 0.5) / numCols) * availableWidth;

      elements.push(
        <View
          key={`${isHome ? 'h' : 'a'}-${player.apiId || player.number}-${rowKey}`}
          style={{
            position: 'absolute',
            left: xPos - 28,
            top: (isHome ? 0 : halfHeight) + yPos - 20,
          }}
        >
          <Jersey player={player} color={jerseyColor} textColor={textColor} />
        </View>,
      );
    });
  });

  return elements;
}

export function FootballPitch({ homeLineup, awayLineup }: Props) {
  return (
    <View style={styles.container}>
      {/* Formation labels */}
      <View style={styles.formationHeader}>
        <View style={styles.formationSide}>
          <View style={[styles.formationDot, { backgroundColor: '#1E40AF' }]} />
          <Text style={styles.formationLabel}>{homeLineup.teamName}</Text>
          <Text style={styles.formationValue}>{homeLineup.formation}</Text>
        </View>
        <View style={styles.formationSide}>
          <View style={[styles.formationDot, { backgroundColor: '#DC2626' }]} />
          <Text style={styles.formationLabel}>{awayLineup.teamName}</Text>
          <Text style={styles.formationValue}>{awayLineup.formation}</Text>
        </View>
      </View>

      {/* Pitch */}
      <View style={[styles.pitch, { width: PITCH_WIDTH, height: PITCH_HEIGHT }]}>
        {/* Field markings */}
        <View style={styles.centerLine} />
        <View style={styles.centerCircle} />
        <View style={styles.centerDot} />
        {/* Top penalty box */}
        <View style={[styles.penaltyBox, styles.penaltyBoxTop]} />
        <View style={[styles.goalBox, styles.goalBoxTop]} />
        {/* Bottom penalty box */}
        <View style={[styles.penaltyBox, styles.penaltyBoxBottom]} />
        <View style={[styles.goalBox, styles.goalBoxBottom]} />
        {/* Corner arcs */}
        <View style={[styles.cornerArc, styles.cornerTL]} />
        <View style={[styles.cornerArc, styles.cornerTR]} />
        <View style={[styles.cornerArc, styles.cornerBL]} />
        <View style={[styles.cornerArc, styles.cornerBR]} />

        {/* Players */}
        {renderTeamOnPitch(homeLineup, true, HALF_HEIGHT, PITCH_WIDTH)}
        {renderTeamOnPitch(awayLineup, false, HALF_HEIGHT, PITCH_WIDTH)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  formationHeader: {
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4,
  },
  formationSide: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formationDot: { width: 8, height: 8, borderRadius: 4 },
  formationLabel: {
    fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  formationValue: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: colors.primary,
  },
  pitch: {
    backgroundColor: '#1B7D3A',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  centerLine: {
    position: 'absolute', top: '50%', left: 0, right: 0,
    height: 1, backgroundColor: 'rgba(255,255,255,0.3)',
  },
  centerCircle: {
    position: 'absolute',
    top: '50%', left: '50%',
    width: 80, height: 80,
    marginLeft: -40, marginTop: -40,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  centerDot: {
    position: 'absolute',
    top: '50%', left: '50%',
    width: 6, height: 6,
    marginLeft: -3, marginTop: -3,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  penaltyBox: {
    position: 'absolute', left: '20%', right: '20%',
    height: '16%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  penaltyBoxTop: { top: 0, borderTopWidth: 0 },
  penaltyBoxBottom: { bottom: 0, borderBottomWidth: 0 },
  goalBox: {
    position: 'absolute', left: '32%', right: '32%',
    height: '7%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  goalBoxTop: { top: 0, borderTopWidth: 0 },
  goalBoxBottom: { bottom: 0, borderBottomWidth: 0 },
  cornerArc: {
    position: 'absolute', width: 16, height: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  cornerTL: { top: -8, left: -8, borderRadius: 8 },
  cornerTR: { top: -8, right: -8, borderRadius: 8 },
  cornerBL: { bottom: -8, left: -8, borderRadius: 8 },
  cornerBR: { bottom: -8, right: -8, borderRadius: 8 },
});
