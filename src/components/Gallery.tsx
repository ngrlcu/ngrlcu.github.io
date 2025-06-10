import RollingGallery from './RollingGallery'
import '../assets/styles/Gallery.scss';

function Gallery() {
  return (
    <div className="gallery-container">
        <h1>Photography</h1>
        <RollingGallery autoplay={true} pauseOnHover={true} />
    </div>
  );
}
  export default Gallery;
