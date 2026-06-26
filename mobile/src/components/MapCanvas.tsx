import Mapbox, {
  Camera,
  LineLayer,
  LocationPuck,
  MapView,
  PointAnnotation,
  ShapeSource,
} from "@rnmapbox/maps";
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { colors, modeColor } from "@/theme";
import type { Coordinate, Gate, Mode } from "@/models/track";

if (MAPBOX_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

function lineFeature(coordinates: Coordinate[]) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates },
  };
}

export function MapCanvas({
  route = [],
  waypoints = [],
  mode = "run",
  startGate,
  finishGate,
  followUser = true,
  center,
  onMapPress,
  children,
}: {
  route?: Coordinate[];
  waypoints?: Coordinate[];
  mode?: Mode;
  startGate?: Gate;
  finishGate?: Gate;
  followUser?: boolean;
  center?: Coordinate;
  onMapPress?: (coord: Coordinate) => void;
  children?: ReactNode;
}) {
  const lineColor = modeColor[mode];

  return (
    <View style={styles.fill}>
      <MapView
        style={styles.fill}
        styleURL="mapbox://styles/mapbox/outdoors-v12"
        scaleBarEnabled={false}
        onPress={(feature) => {
          const geometry = feature.geometry as { coordinates?: number[] };
          if (onMapPress && geometry?.coordinates) {
            onMapPress([geometry.coordinates[0], geometry.coordinates[1]]);
          }
        }}
      >
        <Camera
          followUserLocation={followUser}
          followZoomLevel={15}
          centerCoordinate={!followUser ? center : undefined}
          zoomLevel={!followUser && center ? 14 : undefined}
          animationDuration={500}
        />
        <LocationPuck puckBearingEnabled visible />

        {route.length >= 2 && (
          <ShapeSource id="route" shape={lineFeature(route)}>
            <LineLayer
              id="route-line"
              style={{
                lineColor,
                lineWidth: 5,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </ShapeSource>
        )}

        {waypoints.map((wp, i) => (
          <PointAnnotation key={`wp-${i}`} id={`wp-${i}`} coordinate={wp}>
            <View style={[styles.waypoint, { borderColor: lineColor }]} />
          </PointAnnotation>
        ))}

        {startGate && (
          <PointAnnotation id="start" coordinate={midpoint(startGate)}>
            <View style={[styles.flag, { backgroundColor: colors.green }]} />
          </PointAnnotation>
        )}
        {finishGate && (
          <PointAnnotation id="finish" coordinate={midpoint(finishGate)}>
            <View style={[styles.flag, { backgroundColor: colors.red }]} />
          </PointAnnotation>
        )}

        {children}
      </MapView>
    </View>
  );
}

function midpoint(gate: Gate): Coordinate {
  return [(gate[0][0] + gate[1][0]) / 2, (gate[0][1] + gate[1][1]) / 2];
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  waypoint: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: "#fff",
  },
  flag: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
});
