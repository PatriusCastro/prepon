// Made-up data for the Larkmoor Freight demo. Larkmoor, its depots, places, people, and plates are fictional.

export type Severity = 'critical' | 'warning';
export type Issue = { severity: Severity; kind: string; detail: string; since: string };
export type Vehicle = {
  id: string; plate: string; driver: string; phone: string; trailer: string;
  route: string; nextStop: string; eta: string; window: string;
  pingSec: number; speed: number; at: LatLng;
  atDepot?: boolean; issue?: Issue;
};
export type LatLng = [number, number];

// The fictional places sit on real terrain around the Humber estuary in East Yorkshire, so the map can use real
// tiles. The basemap has no labels; these names are drawn on top. Vehicle positions are approximate.
export const DEPOT = { name: 'Northgate depot', shift: 'Day shift, 06:00–18:00', at: [53.745, -0.868] as LatLng };
export const USER = { name: 'Dana Okafor', role: 'Dispatcher' };
export const LAST_GOOD = '14:02';
// The demo's fixed "now", so the shift bar and the exception times agree whatever the visitor's clock says.
export const SHIFT = { start: '06:00', end: '18:00', now: '14:26' };

export const PLACES: { name: string; at: LatLng }[] = [
  { name: 'Calder Mills', at: [53.955, -1.08] }, { name: 'Brennick', at: [53.842, -0.435] },
  { name: 'Ashby Cross', at: [53.692, -1.31] }, { name: 'Fenwick Quay', at: [53.739, -0.34] },
  { name: 'Tarrin Bridge', at: [53.684, -0.436] }, { name: 'Holloway Park', at: [53.611, -0.962] },
];

const v = (o: Vehicle) => o;

export const VEHICLES: Vehicle[] = [
  v({ id: 'LM-214', plate: 'KD71 RWX', driver: 'Tomasz Wieczorek', phone: '07700 900412', trailer: 'Reefer T-88',
      route: 'R07 Northgate → Brennick', nextStop: 'Brennick Co-op, Mill Street', eta: '14:55', window: '14:30–15:30',
      pingSec: 9, speed: 62, at: [53.813, -0.565],
      issue: { severity: 'critical', kind: 'Reefer fault', since: '13:51',
        detail: 'Trailer at 9.4 °C, limit 5 °C. Chilled dairy on board (18 pallets).' } }),
  v({ id: 'LM-187', plate: 'BX69 HLT', driver: 'Priya Raman', phone: '07700 900187', trailer: 'Curtainsider C-12',
      route: 'R14 Northgate → Tarrin Bridge', nextStop: 'Tarrin Bridge Builders Yard', eta: 'Unknown', window: '14:00–16:00',
      pingSec: 1384, speed: 0, at: [53.697, -0.448],
      issue: { severity: 'critical', kind: 'No signal', since: '13:49',
        detail: 'No position for 23 minutes. Last seen stationary on the Quay link, 1.2 km north of Tarrin Bridge.' } }),
  v({ id: 'LM-342', plate: 'YH20 KPE', driver: 'Gareth Llewellyn-Hughes', phone: '07700 900342', trailer: 'Box B-31',
      route: 'R03 Northgate → Calder Mills', nextStop: 'Calder Mills Retail Park, Unit 4', eta: '15:40', window: '14:30–15:15',
      pingSec: 14, speed: 23, at: [53.875, -0.999],
      issue: { severity: 'warning', kind: 'Late', since: '14:10',
        detail: 'ETA 15:40, 25 min after the delivery window closes. Slow traffic on the A61.' } }),
  v({ id: 'LM-309', plate: 'LN21 OAV', driver: 'Aisha Bello', phone: '07700 900309', trailer: 'Box B-07',
      route: 'R11 Northgate → Fenwick Quay', nextStop: 'Fenwick Quay Cold Store', eta: '15:05', window: '14:45–15:45',
      pingSec: 22, speed: 41, at: [53.753, -0.498],
      issue: { severity: 'warning', kind: 'Off route', since: '14:18',
        detail: '1.8 km off the planned route, on Rope Walk. Possibly avoiding the A9 roadworks.' } }),
  v({ id: 'LM-125', plate: 'MF19 TZU', driver: 'Liam O’Driscoll', phone: '07700 900125', trailer: 'Flatbed F-03',
      route: 'R09 Northgate → Holloway Park', nextStop: 'Holloway Park Timber', eta: '15:12', window: '14:00–15:00',
      pingSec: 31, speed: 48, at: [53.644, -0.939],
      issue: { severity: 'warning', kind: 'Late', since: '14:24',
        detail: 'ETA 15:12, 12 min after the delivery window closes.' } }),
  v({ id: 'LM-101', plate: 'KD70 AEB', driver: 'Mei Lin Zhao', phone: '07700 900101', trailer: 'Box B-02',
      route: 'R01 Northgate → Ashby Cross', nextStop: 'Ashby Cross Pharmacy Hub', eta: '14:48', window: '14:30–15:30',
      pingSec: 6, speed: 57, at: [53.705, -1.204] }),
  v({ id: 'LM-108', plate: 'BX68 NNR', driver: 'Samuel Adeyemi', phone: '07700 900108', trailer: 'Curtainsider C-04',
      route: 'R02 Northgate → Calder Mills', nextStop: 'Calder Mills Garden Centre', eta: '14:41', window: '14:00–15:00',
      pingSec: 11, speed: 52, at: [53.921, -1.046] }),
  v({ id: 'LM-112', plate: 'YH71 CJD', driver: 'Freya Lindqvist', phone: '07700 900112', trailer: 'Reefer T-41',
      route: 'R07 Northgate → Brennick', nextStop: 'Brennick Fresh Market', eta: '15:20', window: '15:00–16:00',
      pingSec: 8, speed: 64, at: [53.777, -0.725] }),
  v({ id: 'LM-119', plate: 'LN70 WQS', driver: 'Kwame Asante', phone: '07700 900119', trailer: 'Box B-15',
      route: 'R11 Northgate → Fenwick Quay', nextStop: 'Fenwick Quay Chandlery', eta: '14:52', window: '14:30–15:30',
      pingSec: 17, speed: 0, at: [53.739, -0.366] }),
  v({ id: 'LM-133', plate: 'MF70 GPL', driver: 'Rosa Delgado Ferrer', phone: '07700 900133', trailer: 'Curtainsider C-19',
      route: 'R05 Northgate → Ashby Cross', nextStop: 'Ashby Cross Tile Depot', eta: '15:34', window: '15:00–17:00',
      pingSec: 12, speed: 49, at: [53.726, -1.023] }),
  v({ id: 'LM-140', plate: 'KD69 YVM', driver: 'Callum Fraser', phone: '07700 900140', trailer: 'Box B-22',
      route: 'R14 Northgate → Tarrin Bridge', nextStop: 'Tarrin Bridge Surgery', eta: '15:02', window: '14:30–15:30',
      pingSec: 7, speed: 55, at: [53.712, -0.47] }),
  v({ id: 'LM-156', plate: 'BX21 DKO', driver: 'Noor Haddad', phone: '07700 900156', trailer: 'Reefer T-90',
      route: 'R12 Northgate → Brennick', nextStop: 'Brennick School Kitchens', eta: '15:45', window: '15:15–16:15',
      pingSec: 19, speed: 60, at: [53.826, -0.509] }),
  v({ id: 'LM-161', plate: 'YH69 PXA', driver: 'Ewan McAllister', phone: '07700 900161', trailer: 'Flatbed F-08',
      route: 'R09 Northgate → Holloway Park', nextStop: 'Holloway Park Roofing', eta: '16:05', window: '15:30–17:00',
      pingSec: 25, speed: 44, at: [53.689, -0.907] }),
  v({ id: 'LM-174', plate: 'LN19 BMU', driver: 'Yasmin Chaudhry', phone: '07700 900174', trailer: 'Box B-28',
      route: 'R03 Northgate → Calder Mills', nextStop: 'Calder Mills Library', eta: '15:28', window: '15:00–16:00',
      pingSec: 10, speed: 58, at: [53.81, -0.934] }),
  v({ id: 'LM-192', plate: 'MF71 SEH', driver: 'Daniel Okonkwo', phone: '07700 900192', trailer: 'Curtainsider C-09',
      route: 'R16 Northgate → Fenwick Quay', nextStop: 'Fenwick Quay Ferry Freight', eta: '16:20', window: '16:00–17:00',
      pingSec: 13, speed: 63, at: [53.743, -0.736] }),
  v({ id: 'LM-203', plate: 'KD20 LFT', driver: 'Hana Kobayashi', phone: '07700 900203', trailer: 'Box B-11',
      route: 'R01 Northgate → Ashby Cross', nextStop: 'Ashby Cross Vets', eta: '15:58', window: '15:30–16:30',
      pingSec: 9, speed: 46, at: [53.717, -1.102] }),
  v({ id: 'LM-228', plate: 'BX70 RRN', driver: 'Oluwaseun Bakare', phone: '07700 900228', trailer: 'Reefer T-52',
      route: 'R12 Northgate → Brennick', nextStop: 'Brennick Hospital Stores', eta: '14:39', window: '14:00–15:00',
      pingSec: 5, speed: 0, at: [53.839, -0.448] }),
  v({ id: 'LM-235', plate: 'YH19 TCV', driver: 'Marta Kowalczyk', phone: '07700 900235', trailer: 'Box B-34',
      route: 'R16 Northgate → Fenwick Quay', nextStop: 'Fenwick Quay Harbour Office', eta: '16:40', window: '16:00–17:30',
      pingSec: 16, speed: 59, at: [53.741, -0.551] }),
  v({ id: 'LM-247', plate: 'LN71 HAZ', driver: 'Ibrahim Sesay', phone: '07700 900247', trailer: 'Curtainsider C-21',
      route: 'R05 Northgate → Ashby Cross', nextStop: 'Ashby Cross Builders Merchant', eta: '16:12', window: '15:30–17:00',
      pingSec: 21, speed: 38, at: [53.698, -1.257] }),
  v({ id: 'LM-251', plate: 'MF20 VBK', driver: 'Chloé Martin', phone: '07700 900251', trailer: '—',
      route: 'Not assigned', nextStop: '—', eta: '—', window: '—',
      pingSec: 40, speed: 0, at: DEPOT.at, atDepot: true }),
  v({ id: 'LM-258', plate: 'KD19 MWG', driver: 'Unassigned', phone: '', trailer: '—',
      route: 'In workshop: brake service', nextStop: '—', eta: 'Back 16:30', window: '—',
      pingSec: 52, speed: 0, at: DEPOT.at, atDepot: true }),
  v({ id: 'LM-263', plate: 'BX20 FEQ', driver: 'Joseph Mensah', phone: '07700 900263', trailer: 'Box B-40',
      route: 'R18 Northgate → Calder Mills', nextStop: 'Loading, bay 6', eta: 'Departs 15:00', window: '16:00–17:00',
      pingSec: 33, speed: 0, at: DEPOT.at, atDepot: true }),
  v({ id: 'LM-270', plate: 'YH70 UDS', driver: 'Ana Sofia Pereira', phone: '07700 900270', trailer: 'Reefer T-17',
      route: 'R20 Northgate → Brennick', nextStop: 'Loading, bay 2', eta: 'Departs 15:15', window: '16:30–17:30',
      pingSec: 28, speed: 0, at: DEPOT.at, atDepot: true }),
  v({ id: 'LM-284', plate: 'LN20 CXP', driver: 'Ruairi Byrne', phone: '07700 900284', trailer: 'Flatbed F-11',
      route: 'R22 Northgate → Holloway Park', nextStop: 'Holloway Park Stone Yard', eta: '16:48', window: '16:00–17:30',
      pingSec: 15, speed: 51, at: [53.655, -0.931] }),
];
