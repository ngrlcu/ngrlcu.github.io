import React from "react";
import Threads from './Threads';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import propic from '../assets/images/propic.png';
import Orb from './Orb';
import '../assets/styles/Main.scss';

function Main() {

  return (
    <div className="container">
      <div className="about-section" style={{ width: '100%', height: '200px', position: 'relative' }}>
        <div className="image-wrapper">
          <img src={propic} alt="Avatar" />
        </div>
        <div style={{ width: '100%', height: '205px', left:'245px', position: 'absolute' }}>
          <Orb
            hoverIntensity={0.5}
            rotateOnHover={true}
            hue={0}
            forceHoverState={false}
          />
        </div>
        <div className="content">
          <div className="social_icons">
            <a href="https://github.com/ngrlcu" target="_blank" rel="noreferrer"><GitHubIcon/></a>
            <a href="https://www.linkedin.com/in/luca-nigro-quantum/" target="_blank" rel="noreferrer"><LinkedInIcon/></a>
          </div>
          <h1>Luca Nigro</h1>
          <p>PhD · Quantum Software Engineer</p>

          <div className="mobile_social_icons">
            <a href="https://github.com/ngrlcu" target="_blank" rel="noreferrer"><GitHubIcon/></a>
            <a href="https://www.linkedin.com/in/luca-nigro-quantum/" target="_blank" rel="noreferrer"><LinkedInIcon/></a>
          </div>
        </div>
        <Threads
          amplitude={4}
          distance={0.6}
          enableMouseInteraction={true}
        />
      </div>
    </div>
  );
}

export default Main;