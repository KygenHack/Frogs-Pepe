import "./styles/Home.css";
import NavBar from "./components/NavBar";
import { ContractMetadata, Web3Button, useActiveClaimConditionForWallet, useAddress, useClaimConditions, useClaimIneligibilityReasons, useClaimerProofs, useContractMetadata, useContractRead, useTokenSupply } from "@thirdweb-dev/react";
import { ConnectWallet, darkTheme } from "@thirdweb-dev/react";
import { tokendropcontract, submitWalletcontracts } from "./const/contractAddresses";
import { useEffect, useMemo, useState } from "react";
import { useContract, useTokenBalance } from "@thirdweb-dev/react";
import { BigNumber, ethers, utils } from "ethers";
import Footerbox from "./components/Footerbox";
import { parseIneligibility } from "./utils/parseIneligibility";
import Swal from "sweetalert2";


export default function Home() {
  const address = useAddress();
  const { contract: tokenContract, isLoading: loadingToken } = useContract(tokendropcontract, "token-drop");
  const { data: tokenBalance, isLoading: loadingTokenBalance } = useTokenBalance(tokenContract, address);

  const {
    contract
  } = useContract(submitWalletcontracts);


  const manualUsdRate = 0.80;
  const [usdPrice, setUsdPrice] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(150000);
  const { data: contractMetadata } = useContractMetadata(tokenContract);
  const claimedSupply = useTokenSupply(tokenContract);
  const { data: tokenSupply, isLoading: loadingTokenSupply } = useTokenSupply(tokenContract);


  const [buyAmount, setBuyAmount] = useState(0.00000000001);
  const [message, setMessage] = useState<string>("");

  const { 
    data: totalCoffees, 
    isLoading: loadingTotalCoffee 
  } = useContractRead(contract, "getTotalCoffee");

  const { 
    data: recentCoffee, 
    isLoading: loadingRecentCoffee 
  } = useContractRead(contract, "getAllCoffee");

  const convertDate = (timestamp: bigint) => {
    const timestampNumber = Number(timestamp);
    return new Date(timestampNumber * 1000).toLocaleString();
};
 
  const [tasksCompleted, setTasksCompleted] = useState({
    telegramChannel: false,
    telegramGroup: false,
    followOnX: false,
    likeOnFacebook: false,
    followOnCMC: false,
    claimTokens: false,
  });

  const handleTaskClick = (taskName: string) => {
    setTasksCompleted((prevState) => ({
      ...prevState,
      [taskName]: true,
    }));
  };

  const allTasksCompleted = Object.values(tasksCompleted).every(Boolean);


  const claimConditions = useClaimConditions(tokenContract);
  const activeClaimCondition = useActiveClaimConditionForWallet(tokenContract, address);
  const claimerProofs = useClaimerProofs(tokenContract, address || "");
  const claimIneligibilityReasons = useClaimIneligibilityReasons(tokenContract, {
    quantity,
    walletAddress: address || "",
  });

  const totalAvailableSupply = useMemo(() => {
    try {
      return BigNumber.from(activeClaimCondition.data?.availableSupply || 0);
    } catch {
      return BigNumber.from(1_000_000_000);
    }
  }, [activeClaimCondition.data?.availableSupply]);

  const numberClaimed = useMemo(() => {
    return BigNumber.from(claimedSupply.data?.value || 0).toString();
  }, [claimedSupply]);

  const numberTotal = useMemo(() => {
    const n = totalAvailableSupply.add(BigNumber.from(claimedSupply.data?.value || 0));
    if (n.gte(1_000_000_000)) {
      return "";
    }
    return n.toString();
  }, [totalAvailableSupply, claimedSupply]);

  const priceToMint = useMemo(() => {
    if (quantity) {
      const bnPrice = BigNumber.from(activeClaimCondition.data?.currencyMetadata.value || 0);
      return `${utils.formatUnits(bnPrice.mul(quantity).toString(), activeClaimCondition.data?.currencyMetadata.decimals || 18)} ${activeClaimCondition.data?.currencyMetadata.symbol}`;
    }
  }, [
    activeClaimCondition.data?.currencyMetadata.decimals,
    activeClaimCondition.data?.currencyMetadata.symbol,
    activeClaimCondition.data?.currencyMetadata.value,
    quantity,
  ]);

  const maxClaimable = useMemo(() => {
    let bnMaxClaimable;
    try {
      bnMaxClaimable = BigNumber.from(activeClaimCondition.data?.maxClaimableSupply || 0);
    } catch (e) {
      bnMaxClaimable = BigNumber.from(1_000_000_000);
    }

    let perTransactionClaimable;
    try {
      perTransactionClaimable = BigNumber.from(activeClaimCondition.data?.maxClaimablePerWallet || 0);
    } catch (e) {
      perTransactionClaimable = BigNumber.from(1_000_000_000);
    }

    if (perTransactionClaimable.lte(bnMaxClaimable)) {
      bnMaxClaimable = perTransactionClaimable;
    }

    const snapshotClaimable = claimerProofs.data?.maxClaimable;

    if (snapshotClaimable) {
      if (snapshotClaimable === "0") {
        // allowed unlimited for the snapshot
        bnMaxClaimable = BigNumber.from(1_000_000_000);
      } else {
        try {
          bnMaxClaimable = BigNumber.from(snapshotClaimable);
        } catch (e) {
          // fall back to default case
        }
      }
    }

    let max;
    if (totalAvailableSupply.lt(bnMaxClaimable)) {
      max = totalAvailableSupply;
    } else {
      max = bnMaxClaimable;
    }

    if (max.gte(1_000_000_000)) {
      return 1_000_000_000;
    }
    return max.toNumber();
  }, [
    claimerProofs.data?.maxClaimable,
    totalAvailableSupply,
    activeClaimCondition.data?.maxClaimableSupply,
    activeClaimCondition.data?.maxClaimablePerWallet,
  ]);

  const isSoldOut = useMemo(() => {
    try {
      return (
        (activeClaimCondition.isSuccess &&
          BigNumber.from(activeClaimCondition.data?.availableSupply || 0).lte(0)) ||
        numberClaimed === numberTotal
      );
    } catch (e) {
      return false;
    }
  }, [
    activeClaimCondition.data?.availableSupply,
    activeClaimCondition.isSuccess,
    numberClaimed,
    numberTotal,
  ]);

  const canClaim = useMemo(() => {
    return (
      activeClaimCondition.isSuccess &&
      claimIneligibilityReasons.isSuccess &&
      claimIneligibilityReasons.data?.length === 0 &&
      !isSoldOut
    );
  }, [
    activeClaimCondition.isSuccess,
    claimIneligibilityReasons.data?.length,
    claimIneligibilityReasons.isSuccess,
    isSoldOut,
  ]);

  const isLoading = useMemo(() => {
    return activeClaimCondition.isLoading || !tokenContract;
  }, [activeClaimCondition.isLoading, tokenContract]);

  const buttonLoading = useMemo(
    () => isLoading || claimIneligibilityReasons.isLoading,
    [claimIneligibilityReasons.isLoading, isLoading]
  );
  
  const buttonText = useMemo(() => {
    if (isSoldOut) {
      return "Checking Status";
    }

    if (canClaim) {
      const pricePerToken = BigNumber.from(activeClaimCondition.data?.currencyMetadata.value || 0);
      if (pricePerToken.eq(0)) {
        return "Claim (Free)";
      }
      return `Claim (${priceToMint})`;
    }
    if (claimIneligibilityReasons.data?.length) {
      return parseIneligibility(claimIneligibilityReasons.data, quantity);
    }
    if (buttonLoading) {
      return "Checking eligibility...";
    }

    return "Claiming not available";
  }, [
    isSoldOut,
    canClaim,
    claimIneligibilityReasons.data,
    buttonLoading,
    activeClaimCondition.data?.currencyMetadata.value,
    priceToMint,
    quantity,
  ]);

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
        <NavBar />
        <main className="main">
          <div className="container">
            <div className="flex flex-col w-full lg:flex-row gap-4 mt-4 allcenter">
              <div className="grid">
                <div className="card">
                  <div className="card-text">
                    <h1 className="gradient-text-0 text-center mt-4 mb-4 frogs-heading">Welcome to participate in Frogs Pepe Airdrop!</h1>

                    <center><img src="https://frogspepe.xyz/banner.png" alt=""></img></center>
                    
                    <h1 className="gradient-text-0 text-center mt-4">About Frogs Pepe Drop ($FPD)</h1>
                    <p className="text-center text-black frogs-text">Frogs Pepe Drop isn't just another meme token. 
                    It's an immersive world where memes and legends collide, bringing together the kingdom of Pepe the Frog's frens. 
                    Dive into a unique realm where community and creativity reign supreme.</p>

                    <div className="contract-div frogs-text mt-4 mb-4"><p>Contract Address
                      0x8d767d59563 1350A7A4D61191317
                      17783976190E</p></div>

                    <p className="text-center text-bold text-black mt-4 mb-4">Whitelist Airdrop will end on July 20, 2024, and every valid participant will be rewarded.</p>  
                    <p className="text-center text-bold text-4xl text-primry text-black mt-4 mb-4">Claim : 150,000 FPD</p>  


                    <p className="text-center mt-4 mb-4 text-black">Please connect your wallet to start claiming.</p>
                    <center><ConnectWallet
        style={{ color: "white", background:"green" }}
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
      /></center>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Footerbox />
        </main>
      </body>
    );
  }

  return (
    <body>
      <NavBar />
      <main className="main">
        <div className="container">
          <div className="flex flex-col w-full lg:flex-row gap-4 mt-4 allcenter">
            <div className="grid">
              <div className="card">
                <div className="card-text">
                  <div className="header">
                  <h1 className="text-center header-text text-black">Hop into Frogs Pepe: <br/>Your Portal to Epic Airdrops and Ribbiting Incubation</h1>
                  <p className="text-black text-center header-desc mt-2 mb-2">Frogs Pepe is here to power your meme crypto adventure with a blend of epic airdrops and incubatior. </p>
                        
                        <div className="">
                        <div className="stat">
						<div className="stat-title text-black text-center">My FPD Balance</div>
            {!loadingToken && !loadingTokenBalance && tokenBalance?.value !== undefined ? (
                            <>
                              <div className="stat-value text-center text-3xl text-black">
                                {`${parseFloat(ethers.utils.formatEther(tokenBalance.value)).toLocaleString()} ${tokenBalance.symbol}`}
                              </div>
                              {usdPrice !== null && (
                                 <p className="text-center text-black">{`${usdPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} USDT </p>
                              )}
                            </>
                          ) : (
                            <div className="skeleton-loader">
                              <div className="stat-value text-center text-black">Loading...</div>
                            </div>
                          )}
					</div>
          <div className="stat">
						<div className="stat-title text-center text-black">Active Participants</div>
						<div className="stat-value text-black"> 
            {!loadingTotalCoffee !== undefined ? (
                            <>
                              <div className="stat-value text-3xl text-center text-black">
                              {totalCoffees?.toString()}
                              </div>
                            </>
                          ) : (
                            <div className="skeleton-loader">
                              <div className="stat-value text-center text-black">Loading...</div>
                            </div>
                          )}
                          </div>
					</div>
          <div className="stat">
						<div className="stat-title text-black text-center">Total Claimed Frogs Pepe </div>
						<div className="stat-value text-black"> 
            {!loadingTokenSupply !== undefined ? (
                            <>
                              <h4 className="stat-value text-center text-3xl text-black">
                              {tokenSupply?.displayValue ? new Intl.NumberFormat('en-US', { style: 'decimal' }).format(parseFloat(tokenSupply.displayValue)) : 'Loading'} {tokenSupply?.symbol}
                              </h4>
                            </>
                          ) : (
                            <div className="skeleton-loader">
                              <div className="stat-value text-center text-black">Loading...</div>
                            </div>
                          )}</div>
					</div>
          </div> 

                  
                        

                        
          <h1 className="header-text text-center text-black">Complete Frogs Pepe Quests</h1>

<ul className="menu bg-white w-full rounded-box">
<li>
<a className="text-black text-task mt-2 mb-2">
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 Join FPD Telegram Channel.
</a>
{tasksCompleted.telegramChannel ? (
 <span className="task-btn check-mark">✓</span>
) : (
 <a href="https://t.me/enterfrogspepe" target="_blank" className="task-btn" onClick={() => handleTaskClick('telegramChannel')}>GO</a>
)}
</li>
<li>
<a className="text-black text-task mt-2 mb-2">
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 Join FPD Telegram Group.
</a>
{tasksCompleted.telegramGroup ? (
 <span className="task-btn check-mark">✓</span>
) : (
 <a href="https://t.me/frogspepechat" target="_blank" className="task-btn" onClick={() => handleTaskClick('telegramGroup')}>GO</a>
)}
</li>
<li>
<a className="text-black text-task mt-2 mb-2">
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 Follow Frogs Pepe on X
</a>
{tasksCompleted.followOnX ? (
 <span className="task-btn check-mark">✓</span>
) : (
 <a href="https://x.com/frogspepeweb3" target="_blank" className="task-btn" onClick={() => handleTaskClick('followOnX')}>GO</a>
)}
</li>
<li>
<a className="text-black text-task mt-2 mb-2">
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 Like our Facebook Page.
</a>
{tasksCompleted.likeOnFacebook ? (
 <span className="task-btn check-mark">✓</span>
) : (
 <a href="https://www.facebook.com/profile.php?id=61558424458048&mibextid=ZbWKwL" target="_blank" className="task-btn" onClick={() => handleTaskClick('likeOnFacebook')}>GO</a>
)}
</li>
<li>
<a className="text-black text-task mt-2 mb-2">
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 Follow us on CMC
</a>
{tasksCompleted.followOnCMC ? (
 <span className=" task-btn check-mark">✓</span>
) : (
 <a href="https://coinmarketcap.com/community/profile/frogspepe/" target="_blank" className="task-btn" onClick={() => handleTaskClick('followOnCMC')}>GO</a>
)}
</li>
<li>
<a className="text-black text-task mt-2 mb-2">
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 Submit Frogs Pepe Drop Wallet Address
</a>
<input 
                className="input w-full invisible"
                type="number" 
                value={buyAmount}
                onChange={(e) => setBuyAmount(Number(e.target.value))}
                step={0.00000001}
                hidden
              />
               <input 
                className="input  walletaddress w-full mb-2"
                placeholder="Your BEP20 Wallet Address" 
                maxLength={80} 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                />

               <Web3Button
                    contractAddress={submitWalletcontracts}
                    action={(contract) => {
                      contract.call("buyMeACoffee", [message], {value: ethers.utils.parseEther("0.000001")})
                    }}
                    onSuccess={() => Swal.fire("Wallet Submitted")}
                    onError={(err) => Swal.fire("OOps Try Again")}
                    style={{ color: "white", background:"green" }}
                  >{"Submit Wallet"}
                  </Web3Button>
                  
               
</li>
<li>
<a className="text-black text-task mt-2 mb-2">
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 Claim 150,000 FPD Tokens
</a>
{tasksCompleted.claimTokens ? (
 <span className="task-btn check-mark">✓</span>
) : (
 <button className="task-btn" onClick={() => handleTaskClick('claimTokens')}>GO</button>
)}
</li>

</ul>

{allTasksCompleted && (
         <section className="">
         <div className="stat text-black">
         {isLoading ? (
      <p className="text-center">Loading Please Wait...</p>
      ) : (
        <>
{contractMetadata?.image && (
<center><img
 src={contractMetadata?.image}
 alt={contractMetadata?.name!}
 width={200}
 height={200}
/>
</center>
)}


<h1 className="text-center header-text">Claim The {contractMetadata?.name}</h1>
<p className="text-center">
<span>{contractMetadata?.description}</span>
You Can Claim Airdrop Multiple Times, Only For Next 24 Hours
</p>
<div className="stat">
						<div className="stat-title text-black text-center">Total Claimed Frogs Pepe </div>
						<div className="stat-value text-black"> 
            {!loadingTokenSupply !== undefined ? (
                            <>
                              <h4 className="stat-value text-center text-sm text-black">
                              {tokenSupply?.displayValue ? new Intl.NumberFormat('en-US', { style: 'decimal' }).format(parseFloat(tokenSupply.displayValue)) : 'Loading'} {tokenSupply?.symbol}
                              </h4>
                            </>
                          ) : (
                            <div className="skeleton-loader">
                              <div className="stat-value text-center text-black">Loading...</div>
                            </div>
                          )}</div>
					</div>
</>
)}

           <input
             type="number"
             placeholder="Enter amount to claim"
             onChange={(e) => {
               const value = parseInt(e.target.value);
               if (value > maxClaimable) {
                 setQuantity(maxClaimable);
               } else if (value < 1) {
                 setQuantity(1);
               } else {
                 setQuantity(value);
               }
             }}
             value={quantity}
             className="form-input mt-4 mb-4"
             
           />

           <Web3Button
             theme="dark"
             contractAddress={tokendropcontract}
             action={(contract) => contract.erc20.claim(quantity)}
             onSuccess={() => Swal.fire("Frogs Pepe Drop Claim Successfully")}
             onError={(err) => Swal.fire("No Gas Fees Try Again")}
             style={{ color: "white", background:"green" }}
           >
             {buttonText}
           </Web3Button>

           {(claimConditions.data &&
             claimConditions.data.length > 0 &&
             activeClaimCondition.isError) ||
            (activeClaimCondition.data &&
            activeClaimCondition.data.startTime > new Date() && (
                <p className="text-black text-center">Drop is starting soon. Please check back later.</p>
             ))}

             {claimConditions.data?.length === 0 ||
             (claimConditions.data?.every((cc) => cc.maxClaimableSupply === "0") && (
                  <p className="text-black text-center">
                This drop is not ready to be minted yet. (No claim condition set)
                </p>
                 ))}
         </div>
       </section>
      )}
                  
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Footerbox />
        </div>
      </main>
    </body>
  );
}
