/*
import { ThirdwebProvider } from "thirdweb/react";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThirdwebProvider
          clientId="f6ba07193b19ed9857c4871a303bb536"  // ✅ Add this line
          activeChain="sepolia"                        // ✅ Optional but recommended
        >
          {children}
        </ThirdwebProvider>
      </body>
    </html>
  );
}
*/
import 'bootstrap/dist/css/bootstrap.min.css';
import '@/styles/globals.css';
import { ThirdwebProvider } from "thirdweb/react";
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
      >
        <ThirdwebProvider>
          {children}
        </ThirdwebProvider>

      </body>
    </html>
  );
}
