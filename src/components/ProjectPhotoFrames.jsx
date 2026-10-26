import './ProjectPhotoFrames.css';
import PhotoAdjustDialog from './PhotoAdjustDialog';

export default function ProjectPhotoFrames({ section, editable, onUpdate, onUploadImage }) {
  if (!editable) return null;
  const storedPhotos = Array.isArray(section.galleryImages) ? section.galleryImages : [];
  const photos = storedPhotos.length ? storedPhotos : section.image ? [section.image] : [];
  const storedSettings = Array.isArray(section.galleryImageSettings) ? section.galleryImageSettings : [];
  const settings = storedSettings.length ? storedSettings : section.image ? [{ zoom: section.imageZoom, x: section.imagePositionX, y: section.imagePositionY }] : [];

  const updatePhotos = (next) => {
    onUpdate?.(section.id, 'galleryImages', next);
    if (section.image) onUpdate?.(section.id, 'image', '');
  };
  const updateSettings = (next) => onUpdate?.(section.id, 'galleryImageSettings', next);
  const removePhoto = (index) => {
    updatePhotos(photos.filter((_, photoIndex) => photoIndex !== index));
    updateSettings(settings.filter((_, photoIndex) => photoIndex !== index));
  };
  const updateCrop = (index, key, value) => {
    if (!storedPhotos.length && section.image) updatePhotos(photos);
    onUpdate?.(section.id, 'galleryImageSettings', (currentSettings = []) => {
      const next = [...currentSettings];
      while (next.length <= index) next.push({ zoom: 100, x: 50, y: 50 });
      next[index] = { zoom: 100, x: 50, y: 50, ...next[index], [key]: value };
      return next;
    });
  };

  return <div className="project-photo-frames" aria-label={`${section.title || 'Project'} photos`}>
    {photos.map((photo, index) => {
      const crop = settings[index] || {};
      const inputId = `project-photo-${section.id}-${index}`;
      return <figure className={`project-photo-frames__item ${photo ? 'has-photo' : 'is-empty'}`} key={`${section.id}-photo-${index}`}>
        {photo ? <img src={photo} alt={`Project photo ${index + 1}`} style={{ objectPosition: `${crop.x ?? 50}% ${crop.y ?? 50}%`, transform: `scale(${Math.min(250, Math.max(100, Number(crop.zoom) || 100)) / 100})` }} /> : <span className="project-photo-frames__empty">Photo {index + 1}</span>}
        <div className="project-photo-frames__actions">
          <label htmlFor={inputId}>{photo ? 'Replace' : 'Add photo'}<input id={inputId} type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label={`${photo ? 'Replace' : 'Add'} project photo ${index + 1}`} onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onUploadImage?.(file, (url) => {
              updatePhotos(photos.map((current, photoIndex) => photoIndex === index ? url : current));
              const nextSettings = [...settings];
              while (nextSettings.length <= index) nextSettings.push({ zoom: 100, x: 50, y: 50 });
              nextSettings[index] = { zoom: 100, x: 50, y: 50 };
              updateSettings(nextSettings);
            });
          }} /></label>
          <button type="button" onClick={() => removePhoto(index)} aria-label={`Remove project photo frame ${index + 1}`}>Remove</button>
        </div>
        {photo && <PhotoAdjustDialog src={photo} zoom={crop.zoom} x={crop.x} y={crop.y} onChange={(key, value) => updateCrop(index, key, value)} />}
      </figure>;
    })}
    <button type="button" className="project-photo-frames__add" onClick={() => {
      if (photos.length >= 30) return;
      updatePhotos([...photos, '']);
      updateSettings([...settings, { zoom: 100, x: 50, y: 50 }]);
    }} disabled={photos.length >= 30}>＋ Add photo</button>
  </div>;
}
