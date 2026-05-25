export const IMG = {
  heroCleaning: require("../assets/images/hero-cleaning.jpg"),
  heroElectrician: require("../assets/images/hero-electrician.jpg"),
  serviceAc: require("../assets/images/service-ac.jpg"),
  serviceDeep: require("../assets/images/service-deep.jpg"),
  servicePlumbing: require("../assets/images/service-plumbing.jpg"),
  serviceSalon: require("../assets/images/service-salon.jpg"),
  pro1: require("../assets/images/pro-1.jpg"),
  pro2: require("../assets/images/pro-2.jpg"),
  pro3: require("../assets/images/pro-3.jpg"),
};

export type Service = {
  slug: string;
  title: string;
  price: number;
  rating: number;
  img: any;
  tagline: string;
};

export const SERVICES: Service[] = [
  // Cleaning Category
  { slug: "full-home-deep-clean", category: "Cleaning", title: "Full Home Deep Cleaning", price: 1499, rating: 4.9, img: IMG.serviceDeep, tagline: "Professional deep cleaning for every corner" },
  { slug: "kitchen-deep-clean", category: "Cleaning", title: "Kitchen Deep Cleaning", price: 899, rating: 4.8, img: IMG.serviceDeep, tagline: "Intense degreasing & appliance cleaning" },
  { slug: "bathroom-deep-clean", category: "Cleaning", title: "Bathroom Deep Cleaning", price: 499, rating: 4.7, img: IMG.serviceDeep, tagline: "Stain removal & full sanitization" },
  { slug: "sofa-cleaning", category: "Cleaning", title: "Sofa & Carpet Cleaning", price: 699, rating: 4.8, img: IMG.serviceDeep, tagline: "Shampooing & dirt extraction" },

  // AC Repair Category
  { slug: "ac-service-gas", category: "AC Repair", title: "AC Service & Gas Refill", price: 599, rating: 4.8, img: IMG.serviceAc, tagline: "Instant cooling restoration" },
  { slug: "ac-repair-install", category: "AC Repair", title: "AC Repair & Installation", price: 1299, rating: 4.9, img: IMG.serviceAc, tagline: "Fix leaks & mounting issues" },

  // Plumbing Category
  { slug: "plumbing-check", category: "Plumbing", title: "General Plumbing Check", price: 299, rating: 4.7, img: IMG.servicePlumbing, tagline: "Fix leaks & drainage issues" },
  { slug: "bathroom-fitting", category: "Plumbing", title: "Bathroom Fittings", price: 499, rating: 4.8, img: IMG.servicePlumbing, tagline: "Taps, showers & pipe repairs" },

  // Electrician Category
  { slug: "electrician-on-demand", category: "Electrician", title: "Certified Electrician", price: 249, rating: 4.8, img: IMG.heroElectrician, tagline: "Fix wiring, switches & panels" },
  { slug: "fan-light-install", category: "Electrician", title: "Fan & Light Install", price: 199, rating: 4.7, img: IMG.heroElectrician, tagline: "Safe & quick installation" },

  // Salon Category
  { slug: "salon-at-home", category: "Salon", title: "Studio Salon for Men", price: 799, rating: 4.9, img: IMG.serviceSalon, tagline: "Professional grooming at home" },
  { slug: "hair-color-style", category: "Salon", title: "Hair Color & Styling", price: 599, rating: 4.8, img: IMG.serviceSalon, tagline: "Premium studio-grade styling" },
];

export const CATEGORIES = [
  { slug: "Cleaning", label: "Cleaning", emoji: "🧽", tint: "#E8F0FF" },
  { slug: "Electrician", label: "Electrician", emoji: "💡", tint: "#FFF4E0" },
  { slug: "Plumbing", label: "Plumbing", emoji: "🔧", tint: "#E7F8EF" },
  { slug: "AC Repair", label: "AC Repair", emoji: "❄️", tint: "#E6F3FF" },
  { slug: "Salon", label: "Salon", emoji: "💅", tint: "#FCE7F3" },
  { slug: "More", label: "More", emoji: "✨", tint: "#EEF1F5" },
];
