import React from 'react'
import { useAddress } from "@thirdweb-dev/react";
import { ConnectWallet, darkTheme } from "@thirdweb-dev/react";

const NavBar = () => {

  const address = useAddress();


  if (!address) {
    return (
      <div className="navbar dashboardbg">
    <div className="navbar-start">
      <div className="dropdown">
        <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /></svg>
        </div>
        <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow text-white rounded-box w-52">
        <li><a href="https://frogspepe.xyz">HOME</a></li>
          <li><a href="https://frogspepe.xyz/about">ABOUT</a></li>
          <li><a href="https://frogspepe.xyz/roadmap">ROADMAP</a></li>
          <li><a href="https://frogspepe.xyz/tokenomics">TOKENOMICS</a></li>
        </ul>
      </div>
      <div className='flex'>
      <img src="https://frogspepe.xyz/images/frogs.png" alt="" width={'84px'}></img>
      </div>
    </div>
    <div className="navbar-center hidden lg:flex">
      <ul className="menu menu-horizontal px-1 text-white">
      <li><a href="https://frogspepe.xyz">HOME</a></li>
          <li><a href="https://frogspepe.xyz/about">ABOUT</a></li>
          <li><a href="https://frogspepe.xyz/roadmap">ROADMAP</a></li>
          <li><a href="https://frogspepe.xyz/tokenomics">TOKENOMICS</a></li>
      </ul>
    </div>
    <div className="navbar-end">
    <ConnectWallet
        theme={"dark"}
        className="lg:hidden"
        btnTitle={"Connect"}
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
      </div>
  </div>
    );
  }


  return (
    <div className="navbar dashboardbg">
    <div className="navbar-start">
      <div className="dropdown">
        <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /></svg>
        </div>
        <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow text-white rounded-box w-52">
        <li><a href="https://frogspepe.xyz">HOME</a></li>
          <li><a href="https://frogspepe.xyz/about">ABOUT</a></li>
          <li><a href="https://frogspepe.xyz/roadmap">ROADMAP</a></li>
          <li><a href="https://frogspepe.xyz/tokenomics">TOKENOMICS</a></li>
        </ul>
      </div>
      <div className='flex'>
      <img src="https://frogspepe.xyz/images/frogs.png" alt="" width={'84px'}></img>
      </div>
    </div>
    <div className="navbar-center hidden lg:flex">
      <ul className="menu menu-horizontal px-1 text-white">
      <li><a href="https://frogspepe.xyz">HOME</a></li>
          <li><a href="https://frogspepe.xyz/about">ABOUT</a></li>
          <li><a href="https://frogspepe.xyz/roadmap">ROADMAP</a></li>
          <li><a href="https://frogspepe.xyz/tokenomics">TOKENOMICS</a></li>
      </ul>
    </div>
    <div className="navbar-end">
    <ConnectWallet
        theme={"dark"}
        className="lg:hidden"
        btnTitle={"Connect"}
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
      </div>
  </div>
  )
}

export default NavBar