import React from "react";
import '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faBuildingColumns, faGraduationCap, faPersonChalkboard} from '@fortawesome/free-solid-svg-icons';
import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import '../assets/styles/Timeline.scss'

function Timeline() {
  return (
    <div id="history">
      <div className="items-container">
        <h1>Recent History</h1>
        <VerticalTimeline>
          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            contentStyle={{ background: 'white', color: 'rgb(39, 40, 34)' }}
            contentArrowStyle={{ borderRight: '7px solid  white' }}
            date="2025 - 2026"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faPersonChalkboard} />}
          >
            <h3 className="vertical-timeline-element-title">Visiting</h3>
            <h4 className="vertical-timeline-element-subtitle">Palma, Spain</h4>
            <p>
              Working on Quantum Reservoir Computing @ Institute for Cross-Disciplinary Physics and Complex Systems (UIB)
            </p>
          </VerticalTimelineElement>
          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            contentStyle={{ background: 'white', color: 'rgb(39, 40, 34)' }}
            contentArrowStyle={{ borderRight: '7px solid  white' }}
            date="2025 - 2025"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBook} />}
          >
            <h3 className="vertical-timeline-element-title">Talent School</h3>
            <h4 className="vertical-timeline-element-subtitle">Trento, Italy</h4>
            <p>
              Nuclear Talent course on Quantum Computing for Nuclear Physics
            </p>
          </VerticalTimelineElement>
          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2024 - 2024"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBook} />}
          >
            <h3 className="vertical-timeline-element-title">Summerschool EQAI</h3>
            <h4 className="vertical-timeline-element-subtitle">Lignano Sabbiadoro, Italy</h4>
            <p>
              European Quantum Artificial Intelligence Summerschool
            </p>
          </VerticalTimelineElement>
          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2023 - present"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faBuildingColumns} />}
          >
            <h3 className="vertical-timeline-element-title">Winning of PhD Scholarship</h3>
            <h4 className="vertical-timeline-element-subtitle">Milan, Italy</h4>
            <p>
              Research topic: "Next generation of quantum algorithms for optimization and quantum chemistry"
            </p>
          </VerticalTimelineElement>
          <VerticalTimelineElement
            className="vertical-timeline-element--work"
            date="2020 - 2023"
            iconStyle={{ background: '#5000ca', color: 'rgb(39, 40, 34)' }}
            icon={<FontAwesomeIcon icon={faGraduationCap} />}
          >
            <h3 className="vertical-timeline-element-title">MSc in Physics</h3>
            <h4 className="vertical-timeline-element-subtitle">Milan, Italy</h4>
            <p>
              Thesis: "Simulation of nuclear reactions by a gate-model quantum computer" (110/110 cum laude)
            </p>
          </VerticalTimelineElement>
        </VerticalTimeline>
      </div>
    </div>
  );
}

export default Timeline;