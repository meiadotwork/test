import { ConfigContext, ExpoConfig } from "expo/config";
import base from "./app.json";

/**
 * Injects secrets from the environment so they are never committed.
 *   MAPBOX_ACCESS_TOKEN     – public token, read at runtime (Mapbox.setAccessToken)
 *   RNMAPBOX_DOWNLOAD_TOKEN – secret token, used at build time to fetch the SDK
 *
 * Copy `.env.example` to `.env` (loaded by Expo) or set these as EAS secrets.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const expo = (base as { expo: ExpoConfig }).expo;
  const downloadToken = process.env.RNMAPBOX_DOWNLOAD_TOKEN ?? "";
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN ?? "";

  const plugins = (expo.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === "@rnmapbox/maps") {
      return ["@rnmapbox/maps", { RNMapboxMapsDownloadToken: downloadToken }] as [
        string,
        Record<string, unknown>,
      ];
    }
    return plugin;
  }) as ExpoConfig["plugins"];

  return {
    ...expo,
    ...config,
    name: expo.name ?? "RaceLine",
    slug: expo.slug ?? "raceline",
    plugins,
    extra: { ...expo.extra, mapboxAccessToken: accessToken },
  };
};
