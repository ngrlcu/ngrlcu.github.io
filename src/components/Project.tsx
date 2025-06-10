import React from "react";
import monz24 from '../assets/images/paper_monz24.png';
import nigr24 from '../assets/images/paper_nigro24.png';
import aps24 from '../assets/images/aps24.png';
import aps25 from '../assets/images/aps25.png';
import cineca23 from '../assets/images/CINECA23.png';
import '../assets/styles/Project.scss';

function Project() {
    return(
    <div className="projects-container" id="projects">
        <h1>Papers and Talks</h1>
        <div className="projects-grid">
            <div className="project">
                <a href="https://arxiv.org/abs/2409.07886" target="_blank" rel="noreferrer"><img src={monz24} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://arxiv.org/abs/2409.07886" target="_blank" rel="noreferrer"><h2>Paper · ArXiv</h2></a>
                <p>Leveraging non-unital noise for gate-based quantum reservoir computing</p>
            </div>
            <div className="project">
                <a href="https://advanced.onlinelibrary.wiley.com/doi/full/10.1002/qute.202400371" target="_blank" rel="noreferrer"><img src={nigr24} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://advanced.onlinelibrary.wiley.com/doi/full/10.1002/qute.202400371" target="_blank" rel="noreferrer"><h2>Paper · Advanced Quantum Technologies</h2></a>
                <p>Simulation of a Three-Nucleons System Transition on Quantum Circuits</p>
            </div>

            <div className="project">
                <a href="http://www.wemanage.jp/" target="_blank" rel="noreferrer"><img src={aps25} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="http://www.wemanage.jp/" target="_blank" rel="noreferrer"><h2>Talk · APS Global Physics Summit</h2></a>
                <p>Benchmarking quantum computing for the wind farm layout optimization problem</p>
            </div>
            <div className="project">
                <a href="https://www.aps.org/events/2024/march-meeting" target="_blank" rel="noreferrer"><img src={aps24} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://www.aps.org/events/2024/march-meeting" target="_blank" rel="noreferrer"><h2>Talk · APS March Meeting</h2></a>
                <p>Quantum digital simulation of the nuclear de-excitation of tritium</p>
            </div>
            <div className="project">
                <a href="https://summit.aps.org/" target="_blank" rel="noreferrer"><img src={cineca23} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://summit.aps.org/" target="_blank" rel="noreferrer"><h2>Talk · CINECA HPC-QC</h2></a>
                <p>Hybrid quantum-classical algorithms for quantum simulation</p>
            </div>
        </div>
    </div>
    );
}

export default Project;