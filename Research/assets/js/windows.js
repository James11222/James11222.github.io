// ╔══════════════════════════════════════════════════════════════════════╗
// ║  WINDOW DEFINITIONS  —  edit this file to manage info panels        ║
// ║                                                                      ║
// ║  Each object in the WINDOWS array is one floating info panel.       ║
// ║  Fields:                                                             ║
// ║                                                                      ║
// ║  frameIn   — frame number when the panel starts sliding in          ║
// ║  framePeak — frame number when the panel is fully visible           ║
// ║  frameOut  — frame number when the panel finishes fading out        ║
// ║              (GIF has 445 frames total, numbered 0–444)             ║
// ║                                                                      ║
// ║  posX  — left edge of the panel, as % of viewport width  (0–100)   ║
// ║  posY  — top  edge of the panel, as % of viewport height (0–100)   ║
// ║          (ignored on mobile — panels are pinned top/bottom there)   ║
// ║  from  — slide-in direction: 'left' or 'right'                      ║
// ║                                                                      ║
// ║  width — panel width in px (optional; omit to use the CSS default)  ║
// ║  scale — physical scale label shown in the panel header             ║
// ║  title — bold heading                                                ║
// ║  image — { src, href, alt }                                          ║
// ║            src:  'images/file.png'  (relative to Research/ folder)   ║
// ║                  '' = show placeholder box instead                   ║
// ║            href: URL the image links to ('#' = no link)             ║
// ║            alt:  alt text                                            ║
// ║  body  — paragraph text                                              ║
// ║  link  — { href, text }  read-more link below the body text         ║
// ╚══════════════════════════════════════════════════════════════════════╝

const WINDOWS = [
  // ── Panel 0 ─────────────────────────────────────────────────────────
  {
    frameIn:   10,
    framePeak: 30,
    frameOut:  50,

    posX: 10,       // % from left
    posY: 40,        // % from top
    from: 'left',

    scale: 'Large-Scale Structure',
    title: 'Effects of Baryonic Feedback on the Cosmic Web',

    image: {
      src:  'images/cweb.png',
      href: 'https://ui.adsabs.harvard.edu/abs/2023PhRvD.107b3514S/abstract',
      alt:  'Effects of Baryonic Feedback on the Cosmic Web',
    },
    body: 'We study the impact of baryonic feedback on the cosmic web with a modified version of the NEXUS+ algorithm. We find that ~10% of the mass of halos is ejected into mostly filaments while not changing volume fractions of structure. We also show that power spectrum suppression due to baryonic feedback can be mostly accounted for by modelling halos above ~10^12 solar masses.',
    link: { href: 'https://ui.adsabs.harvard.edu/abs/2023PhRvD.107b3514S/abstract', text: 'Read more →' },
  },

  // ── Panel 1 ─────────────────────────────────────────────────────────
  {
    frameIn:   10,
    framePeak: 30,
    frameOut:  50,

    posX: 70,       // % from left
    posY: 8,        // % from top
    from: 'left',

    scale: 'Large-Scale Structure',
    title: 'Power of the Cosmic Web',

    image: {
      src:  'images/fisher.png',
      href: 'https://ui.adsabs.harvard.edu/abs/2025PhRvD.112f3516S/abstract',
      alt:  'Power of the Cosmic Web',
    },
    body: 'We show that splitting the density field into the 4 components of the cosmic web (nodes, filaments, walls, voids) and combining the power spectrum in each provides much tighter constraints on cosmological parameters than using the power spectrum without splitting. We show the rich information contained in the cosmic web structures for measuring all of the cosmological parameters, and in particular for constraining neutrino mass.',
    link: { href: 'https://ui.adsabs.harvard.edu/abs/2025PhRvD.112f3516S/abstract', text: 'Read more →' },
  },

  // ── Panel 2 ─────────────────────────────────────────────────────────
  {
    frameIn:   100,
    framePeak: 140,
    frameOut:  180,

    posX: 14,
    posY: 10,
    from: 'left',

    scale: 'Halo Scale',
    title: 'Disentangling the Halo: kSZ + GGL',

    image: {
      src:  'images/ksz_ggl.png',
      href: 'https://ui.adsabs.harvard.edu/abs/2026MNRAS.546ag031S/abstract',
      alt:  'kSZ+GGL',
    },
    body: 'We show the complementarity of the kinematic Sunyaev-Zel’dovich (kSZ) effect and galaxy-galaxy lensing (GGL) for constraining the gas density profile in halos. We show that jointly modeling the combination of kSZ and GGL can break degeneracies present when only one of the two probes is used.',
    link: { href: 'https://ui.adsabs.harvard.edu/abs/2026MNRAS.546ag031S/abstract', text: 'Read more →' },
  },

  // ── Panel 3 ─────────────────────────────────────────────────────────
  {
    frameIn:   200,
    framePeak: 250,
    frameOut:  430,

    posX: 66,
    posY: 10,
    from: 'right',

    scale: 'Galaxy Scale',
    title: 'SMBH Growth in the Massive Galaxies at Cosmic Dawn',

    image: {
      src:  'images/smbh.png',
      href: 'https://ui.adsabs.harvard.edu/abs/2025arXiv251019822S/abstract',
      alt:  'Supermassive black hole',
    },
    body: 'In a series of numerical experiments, we investigate how SMBHs grow within and influence the most massive galaxies at Cosmic Dawn using cosmological hydrodynamic zoom-in simulations run with the AMR code RAMSES. In the absence of AGN feedback, we find that the SMBH is starved∼50% of the time after the onset of star formation in the galaxy. SMBH growth can become self-regulated by AGN feedback if the SMBH becomes massive enough, either by accretion or seeding, for its feedback to dominate the surrounding nuclear region. We find no evidence of galaxy-scale, AGN-driven quenching in the star formation rate (SFR) across all simulations in our suite.',
    link: { href: 'https://ui.adsabs.harvard.edu/abs/2025arXiv251019822S/abstract', text: 'Read more →' },
  },

  // ── Panel 4 ─────────────────────────────────────────────────────────
  {
    frameIn:   250,
    framePeak: 300,
    frameOut:  350,

    posX: 7,
    posY: 20,
    from: 'left',

    scale: 'Galaxy Scale',
    title: 'SARABANDE: 3/4 PCFs of the ISM with FFTs',

    image: {
      src:  'images/sarabande.png',
      href: 'https://ui.adsabs.harvard.edu/abs/2023RASTI...2...62S/abstract',
      alt:  'ISM',
    },
    body: 'I built the SARABANDE code to measure 3 and 4 point correlation functions (PCFs) of gridded datasets using fast Fourier transforms (FFTs). The code runs in O(N log N) time instead of O(N^3) or O(N^4) time, making it possible to measure 3/4 PCFs of the ISM in large simulations and observations. We used SARABANDE to measure the connected 4PCF of the ISM for the first time.',
    link: { href: 'https://ui.adsabs.harvard.edu/abs/2023RASTI...2...62S/abstract', text: 'Read more →' },
  },

];
