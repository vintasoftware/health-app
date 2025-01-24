import { colorScheme } from "nativewind";

import { config as themeConfig } from "@/components/gluestack-ui-provider/config";

export function getThemeColor(colorName: string) {
  const color = themeConfig[colorScheme.get() ?? "light"][colorName];
  return `rgb(${color.replace("rgb(", "").replace("/<alpha-value>)", "")})`;
}
