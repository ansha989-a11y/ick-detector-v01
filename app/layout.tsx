import './globals.css'

export const metadata = {
  title: 'The Ick Detector — Finally, Clarity',
  description: "Describe what happened. Get an Ick Score, a pattern breakdown, and the answer you've been circling for weeks.",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Outfit:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
