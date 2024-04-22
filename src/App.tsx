import "./styles/Home.css";
import NavBar from "./components/NavBar";
import { useAddress } from "@thirdweb-dev/react";
import { ConnectWallet, darkTheme } from "@thirdweb-dev/react";
import { tokendropcontract } from "./const/contractAddresses";
import { useEffect, useState } from "react";
import { useContract, useTokenBalance } from "@thirdweb-dev/react";
import { ethers } from "ethers";
import Footerbox from "./components/Footerbox";


export default function Home() {
  const address = useAddress();
  const { contract: tokenContract, isLoading: loadingToken } = useContract(tokendropcontract);
  const { data: tokenBalance, isLoading: loadingTokenBalance } = useTokenBalance(tokenContract, address);
  const manualUsdRate = 0.80; // Set your manual USD rate here
  const [usdPrice, setUsdPrice] = useState<number | null>(null);


  useEffect(() => {
    // Calculate the USD price based on the manual rate
    if (tokenBalance?.value !== undefined) {
      const usdPrice = parseFloat(ethers.utils.formatEther(tokenBalance.value)) * manualUsdRate;
      setUsdPrice(usdPrice);
    }
  }, [tokenBalance, manualUsdRate]);

  

  if (!address) {
    return (
      <body>
    <NavBar/>
    <main className="main">
      <div className="container">
        <div className="header">
          <h1 className="title text-center">
            Welcome to{" "}
            <span className="gradient-text-0">
              <a
                href="https://thirdweb.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                $FPEPE STAKING
              </a>
            </span>
          </h1>

          <p className="description">
          The distribution of $FPEPE token rewards will occur at a rate of 369 $FPEPE tokens per Ethereum (ETH) block and will be disbursed over 9 months.
          </p>
        </div>

        <div className="flex flex-col w-full lg:flex-row gap-4 mt-4 allcenter">
        <div className="grid">
        <div className="card">
            <div className="card-text">
            <img src="https://frogspepe.xyz/images/frogs.png" alt="" width={'104px'}></img>
            <h1 className="gradient-text-0 text-center mt-4 mb-4">Authenticate Wallet</h1>
            <p className="text-center">To start mining Frogs Pepe King Rewards, simply connect your wallet, which stores your Frogs Pepe Drops.</p>
            <br/>
        <p className="text-center mt-4 mb-4">Please connect your wallet</p>
             <center> <ConnectWallet
        theme={"dark"}
        className="lg:hidden"
        btnTitle={"Connect Wallet"}
        modalTitle={"Authenticate Wallet"}
        switchToActiveChain={true}
        modalSize={"compact"}
        welcomeScreen={{}}
        termsOfServiceUrl={
          "https://frogspepe.xyz"
        }
        privacyPolicyUrl={
          "https://frogspepe.xyz"
        }
      />
      </center>
            </div>
          </div>
          </div> 
         
        </div>
      </div>
      <Footerbox/>
    </main>
    </body>
    );
  }

 
  return (
    <body>
    <NavBar/>
    <main className="main">
      <div className="container">
        <div className="flex flex-col w-full lg:flex-row gap-4 mt-4 allcenter">
        <div className="grid">
        <div className="card">
            <div className="card-text">
            <img src="https://frogspepe.xyz/images/frogs.png" alt="" width={'104px'}></img>
             <section className="stats stats-vertical col-span-12 bg-white text-black w-full shadow-sm xl:stats-horizontal">
      <div className="stat">
      <img src="https://frogspepe.xyz/images/fpepe.png" alt="" width={'104px'}></img>
        <div className="stat-title text-black">$FPEPE Balance</div>
        <div className="stat-value">{!loadingToken && !loadingTokenBalance && tokenBalance?.value !== undefined ? (
          <>
            <h4 className="stat-value text-black">
              {`${parseFloat(ethers.utils.formatEther(tokenBalance.value)).toLocaleString()} ${tokenBalance.symbol}`}
            </h4>
            {usdPrice !== null && (
              <p className="text-black balance-font ">
             ${`${usdPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} USDT
              </p>
            )}
          </>
        ) : (
          <div className="skeleton-loader">
            <div className="stat-value text-black">Loading...</div>
          </div>
        )}</div>  
      </div>
      
    </section>

    {/* <section className="stats stats-vertical col-span-12 bg-white text-black w-full shadow-sm xl:stats-horizontal mt-4">
      <div className="stat">
        <div className="stat-title text-black">FROGS PEPE GROWTH</div>
        <div className="stat-value">150,000 FPD</div>  
      </div>  
    </section>

    <section className="stats stats-vertical col-span-12 bg-white text-black w-full shadow-sm xl:stats-horizontal mt-4">
      <div className="stat">
        <div className="stat-title text-black">FROGS PEPE INCUBATION</div>
        <div className="stat-value">150,000 FPD</div>  
      </div>  
    </section> */}
              </div>
          </div>
          </div> 
        </div>
      </div>
      <Footerbox/>
    </main>
    </body>
  );
}
