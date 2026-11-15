import localFont from "next/font/local";

export const satoshi = localFont({
    src: [
        { path: "../../public/fonts/Satoshi-Black.ttf", weight: "800", style: "normal" },
        { path: "../../public/fonts/Satoshi-Bold.ttf", weight: "700", style: "normal" },
        { path: "../../public/fonts/Satoshi-Medium.ttf", weight: "500", style: "normal" },
        { path: "../../public/fonts/Satoshi-Regular.ttf", weight: "400", style: "normal" },
    ],
    variable: "--font-satoshi",
    display: "swap",
});
