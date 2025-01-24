"use client";
import { vars } from "nativewind";

export const config = {
  light: vars({
    /* Primary - Navy */
    "--color-primary-50": "244 248 250",
    "--color-primary-100": "220 241 251",
    "--color-primary-200": "180 223 247",
    "--color-primary-300": "130 192 234",
    "--color-primary-400": "79 155 218",
    "--color-primary-500": "60 121 201", // Main brand color
    "--color-primary-600": "50 94 180",
    "--color-primary-700": "41 70 145",
    "--color-primary-800": "29 47 104",
    "--color-primary-900": "17 29 67",

    /* Secondary - Blue */
    "--color-secondary-50": "247 249 251",
    "--color-secondary-100": "227 240 253",
    "--color-secondary-200": "197 217 250",
    "--color-secondary-300": "157 182 243",
    "--color-secondary-400": "121 142 234",
    "--color-secondary-500": "98 105 227", // Main secondary color
    "--color-secondary-600": "80 77 213",
    "--color-secondary-700": "61 57 182",
    "--color-secondary-800": "43 39 136",
    "--color-secondary-900": "24 24 85",

    /* Tertiary - Indigo */
    "--color-tertiary-50": "248 250 251",
    "--color-tertiary-100": "235 240 252",
    "--color-tertiary-200": "214 214 249",
    "--color-tertiary-300": "181 176 240",
    "--color-tertiary-400": "155 135 229",
    "--color-tertiary-500": "130 98 220", // Main tertiary color
    "--color-tertiary-600": "107 70 203",
    "--color-tertiary-700": "81 52 169",
    "--color-tertiary-800": "56 36 122",
    "--color-tertiary-900": "31 23 74",

    /* Error - Cerise */
    "--color-error-50": "253 252 251",
    "--color-error-100": "251 240 238",
    "--color-error-200": "247 207 220",
    "--color-error-300": "237 162 185",
    "--color-error-400": "234 114 146",
    "--color-error-500": "221 78 113", // Main error color
    "--color-error-600": "198 52 81",
    "--color-error-700": "158 39 59",
    "--color-error-800": "114 27 39",
    "--color-error-900": "70 17 21",

    /* Success - Green */
    "--color-success-50": "245 247 243",
    "--color-success-100": "230 240 228",
    "--color-success-200": "196 229 195",
    "--color-success-300": "141 200 145",
    "--color-success-400": "72 166 96",
    "--color-success-500": "50 138 58", // Main success color
    "--color-success-600": "42 114 41",
    "--color-success-700": "36 87 34",
    "--color-success-800": "26 59 27",
    "--color-success-900": "18 36 21",

    /* Warning - Gold */
    "--color-warning-50": "251 250 246",
    "--color-warning-100": "249 240 202",
    "--color-warning-200": "242 219 149",
    "--color-warning-300": "223 181 97",
    "--color-warning-400": "200 137 55",
    "--color-warning-500": "171 105 29", // Main warning color
    "--color-warning-600": "141 79 19",
    "--color-warning-700": "108 59 16",
    "--color-warning-800": "73 40 13",
    "--color-warning-900": "48 25 10",

    /* Info - Submarine */
    "--color-info-50": "240 246 246",
    "--color-info-100": "211 240 245",
    "--color-info-200": "161 229 232",
    "--color-info-300": "104 202 203",
    "--color-info-400": "45 170 167",
    "--color-info-500": "32 141 130", // Main info color
    "--color-info-600": "28 117 104",
    "--color-info-700": "26 89 81",
    "--color-info-800": "19 61 60",
    "--color-info-900": "13 37 43",

    /* Typography */
    "--color-typography-0": "254 254 255",
    "--color-typography-50": "245 245 245",
    "--color-typography-100": "229 229 229",
    "--color-typography-200": "219 219 220",
    "--color-typography-300": "212 212 212",
    "--color-typography-400": "163 163 163",
    "--color-typography-500": "140 140 140",
    "--color-typography-600": "115 115 115",
    "--color-typography-700": "82 82 82",
    "--color-typography-800": "64 64 64",
    "--color-typography-900": "38 38 39",
    "--color-typography-950": "23 23 23",

    /* Outline */
    "--color-outline-0": "253 254 254",
    "--color-outline-50": "243 243 243",
    "--color-outline-100": "230 230 230",
    "--color-outline-200": "221 220 219",
    "--color-outline-300": "211 211 211",
    "--color-outline-400": "165 163 163",
    "--color-outline-500": "140 141 141",
    "--color-outline-600": "115 116 116",
    "--color-outline-700": "83 82 82",
    "--color-outline-800": "65 65 65",
    "--color-outline-900": "39 38 36",
    "--color-outline-950": "26 23 23",

    /* Background */
    "--color-background-0": "255 255 255",
    "--color-background-50": "246 246 246",
    "--color-background-100": "242 241 241",
    "--color-background-200": "220 219 219",
    "--color-background-300": "213 212 212",
    "--color-background-400": "162 163 163",
    "--color-background-500": "142 142 142",
    "--color-background-600": "116 116 116",
    "--color-background-700": "83 82 82",
    "--color-background-800": "65 64 64",
    "--color-background-900": "39 38 37",
    "--color-background-950": "18 18 18",

    /* Background Special */
    "--color-background-error": "254 241 241",
    "--color-background-warning": "255 243 234",
    "--color-background-success": "237 252 242",
    "--color-background-muted": "247 248 247",
    "--color-background-info": "235 248 254",

    /* Focus Ring Indicator  */
    "--color-indicator-primary": "55 55 55",
    "--color-indicator-info": "83 153 236",
    "--color-indicator-error": "185 28 28",
  }),
  dark: vars({
    /* Primary - Navy (dark) */
    "--color-primary-50": "17 29 67",
    "--color-primary-100": "29 47 104",
    "--color-primary-200": "41 70 145",
    "--color-primary-300": "79 155 218",
    "--color-primary-400": "130 192 234",
    "--color-primary-500": "180 223 247",
    "--color-primary-600": "220 241 251",
    "--color-primary-700": "244 248 250",
    "--color-primary-800": "248 250 252",
    "--color-primary-900": "250 252 254",

    /* Secondary - Blue (dark) */
    "--color-secondary-50": "24 24 85",
    "--color-secondary-100": "43 39 136",
    "--color-secondary-200": "80 77 213",
    "--color-secondary-300": "98 105 227",
    "--color-secondary-400": "121 142 234",
    "--color-secondary-500": "157 182 243",
    "--color-secondary-600": "197 217 250",
    "--color-secondary-700": "227 240 253",
    "--color-secondary-800": "237 245 254",
    "--color-secondary-900": "247 249 251",

    /* Tertiary - Indigo (dark) */
    "--color-tertiary-50": "31 23 74",
    "--color-tertiary-100": "56 36 122",
    "--color-tertiary-200": "107 70 203",
    "--color-tertiary-300": "130 98 220",
    "--color-tertiary-400": "155 135 229",
    "--color-tertiary-500": "181 176 240",
    "--color-tertiary-600": "214 214 249",
    "--color-tertiary-700": "235 240 252",
    "--color-tertiary-800": "242 245 253",
    "--color-tertiary-900": "248 250 251",

    /* Error - Cerise (dark) */
    "--color-error-50": "70 17 21",
    "--color-error-100": "114 27 39",
    "--color-error-200": "198 52 81",
    "--color-error-300": "221 78 113",
    "--color-error-400": "234 114 146",
    "--color-error-500": "237 162 185",
    "--color-error-600": "247 207 220",
    "--color-error-700": "251 240 238",
    "--color-error-800": "252 246 245",
    "--color-error-900": "253 252 251",

    /* Success - Green (dark) */
    "--color-success-50": "18 36 21",
    "--color-success-100": "26 59 27",
    "--color-success-200": "42 114 41",
    "--color-success-300": "50 138 58",
    "--color-success-400": "72 166 96",
    "--color-success-500": "141 200 145",
    "--color-success-600": "196 229 195",
    "--color-success-700": "230 240 228",
    "--color-success-800": "238 244 236",
    "--color-success-900": "245 247 243",

    /* Warning - Gold (dark) */
    "--color-warning-50": "48 25 10",
    "--color-warning-100": "73 40 13",
    "--color-warning-200": "141 79 19",
    "--color-warning-300": "171 105 29",
    "--color-warning-400": "200 137 55",
    "--color-warning-500": "223 181 97",
    "--color-warning-600": "242 219 149",
    "--color-warning-700": "249 240 202",
    "--color-warning-800": "250 245 224",
    "--color-warning-900": "251 250 246",

    /* Info - Submarine (dark) */
    "--color-info-50": "13 37 43",
    "--color-info-100": "19 61 60",
    "--color-info-200": "28 117 104",
    "--color-info-300": "32 141 130",
    "--color-info-400": "45 170 167",
    "--color-info-500": "104 202 203",
    "--color-info-600": "161 229 232",
    "--color-info-700": "211 240 245",
    "--color-info-800": "226 243 246",
    "--color-info-900": "240 246 246",

    /* Typography */
    "--color-typography-0": "23 23 23",
    "--color-typography-50": "38 38 38",
    "--color-typography-100": "64 64 64",
    "--color-typography-200": "82 82 82",
    "--color-typography-300": "115 115 115",
    "--color-typography-400": "163 163 163",
    "--color-typography-500": "212 212 212",
    "--color-typography-600": "229 229 229",
    "--color-typography-700": "245 245 245",
    "--color-typography-800": "250 250 250",
    "--color-typography-900": "254 254 255",
    "--color-typography-950": "255 255 255",

    /* Outline (dark) */
    "--color-outline-0": "39 39 39",
    "--color-outline-50": "45 45 45",
    "--color-outline-100": "51 51 51",
    "--color-outline-200": "58 58 58",
    "--color-outline-300": "64 64 64",
    "--color-outline-400": "82 82 82",
    "--color-outline-500": "115 115 115",
    "--color-outline-600": "163 163 163",
    "--color-outline-700": "212 212 212",
    "--color-outline-800": "229 229 229",
    "--color-outline-900": "245 245 245",
    "--color-outline-950": "250 250 250",

    /* Background (dark) */
    "--color-background-0": "23 23 23",
    "--color-background-50": "38 38 38",
    "--color-background-100": "45 45 45",
    "--color-background-200": "51 51 51",
    "--color-background-300": "64 64 64",
    "--color-background-400": "82 82 82",
    "--color-background-500": "115 115 115",
    "--color-background-600": "163 163 163",
    "--color-background-700": "212 212 212",
    "--color-background-800": "229 229 229",
    "--color-background-900": "245 245 245",
    "--color-background-950": "254 254 255",

    /* Background Special (dark) */
    "--color-background-error": "66 43 43",
    "--color-background-warning": "65 47 35",
    "--color-background-success": "28 43 33",
    "--color-background-muted": "38 38 38",
    "--color-background-info": "26 40 46",

    /* Focus Ring Indicator (dark) */
    "--color-indicator-primary": "247 247 247",
    "--color-indicator-info": "161 199 245",
    "--color-indicator-error": "232 70 69",
  }),
};
