import React from "react";
import '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faReact, faPython } from '@fortawesome/free-brands-svg-icons';
import { faMicroscope } from '@fortawesome/free-solid-svg-icons';
import Chip from '@mui/material/Chip';
import '../assets/styles/Expertise.scss';

const labelsFirst = [
    "Qiskit (IBM)",
    "PennyLane (Xanadu)",
    "Ocean (DWave)",
    "Bloqade (QuEra)",
    "Pulser (Pasqal)",
    "Cirq (Google)",
    "Braket (AWS)",
    "Azure (Microsoft)",
];

const labelsSecond = [
    "Python",
    "C++",
    "Julia",
    "C",
    "TypeScript",
    "JavaScript",
    "HTML5",
    "CSS3"
];

const labelsThird = [
    "Quantum Machine Intelligence",
    "Quantum Information Processing",
    "CINECA",
    "APS March Meetings"
];

function Expertise() {
    return (
    <div className="container" id="expertise">
        <div className="skills-container">
            <h1>Expertise</h1>
            <div className="skills-grid">
                <div className="skill">
                    <FontAwesomeIcon icon={faReact} size="3x"/>
                    <h3>Quantum Software Engineering</h3>
                    <p>I applied different quantum algorithms for optimization problems (Quantum Optimization) and quantum physics simulations (Quantum Simulation).</p>
                    <div className="flex-chips">
                        {labelsFirst.map((label, index) => (
                            <Chip key={index} className='chip' label={label} />
                        ))}
                    </div>
                </div>

                <div className="skill">
                    <FontAwesomeIcon icon={faPython} size="3x"/>
                    <h3>Coding Languages</h3>
                    <p>The majority of quantum development kits requires advanced Python skills. It is useful in some occasions to take advantage of C++ or Julia for faster performance.</p>
                    <div className="flex-chips">
                        {labelsSecond.map((label, index) => (
                            <Chip key={index} className='chip' label={label} />
                        ))}
                    </div>
                </div>

                <div className="skill">
                    <FontAwesomeIcon icon={faMicroscope} size="3x"/>
                    <h3>Scientific Services</h3>
                    <p>I have had the chance of be part of organizing committees and peer reviews, contributing actively to progress.</p>
                    <div className="flex-chips">
                        {labelsThird.map((label, index) => (
                            <Chip key={index} className='chip' label={label} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
}

export default Expertise;