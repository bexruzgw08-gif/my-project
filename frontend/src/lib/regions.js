// Regions of Uzbekistan with approximate centre coordinates (used to centre the map).
export const REGIONS = [
  { name: 'Toshkent shahri', lat: 41.3111, lng: 69.2797 },
  { name: 'Toshkent viloyati', lat: 41.0, lng: 69.6 },
  { name: 'Andijon viloyati', lat: 40.7821, lng: 72.3442 },
  { name: 'Buxoro viloyati', lat: 39.7747, lng: 64.4286 },
  { name: 'Farg‘ona viloyati', lat: 40.3864, lng: 71.7864 },
  { name: 'Jizzax viloyati', lat: 40.1158, lng: 67.8422 },
  { name: 'Namangan viloyati', lat: 40.9983, lng: 71.6726 },
  { name: 'Navoiy viloyati', lat: 40.1039, lng: 65.3792 },
  { name: 'Qashqadaryo viloyati', lat: 38.8606, lng: 65.7891 },
  { name: 'Qoraqalpog‘iston Respublikasi', lat: 42.4531, lng: 59.6103 },
  { name: 'Samarqand viloyati', lat: 39.6542, lng: 66.9597 },
  { name: 'Sirdaryo viloyati', lat: 40.4897, lng: 68.7842 },
  { name: 'Surxondaryo viloyati', lat: 37.2242, lng: 67.2783 },
  { name: 'Xorazm viloyati', lat: 41.55, lng: 60.6333 },
];

export const UZ_CENTER = { lat: 41.3111, lng: 69.2797 };

export const regionCenter = (name) => REGIONS.find((r) => r.name === name) || UZ_CENTER;
