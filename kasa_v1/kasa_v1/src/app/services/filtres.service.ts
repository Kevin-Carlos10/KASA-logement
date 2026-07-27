import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FiltresService {
  readonly quartiers: string[] = [
    'Ouaga 2000',
    'Karpala',
    'Rayongo',
    'Bonogo',
    'Saaba',
    'Pissy',
    'Cissin',
    'Dassasgho',
    'Gounghin',
    'Wemtenga',
  ];

  readonly typeLogement: string[] = [
    'Chambre salon',
    '2 chambres salon',
    '3 chambres salon',
    'Appartement',
    'Villa',
    'Duplex',
  ];

  readonly budgets: string[] = ['Moins de 35k', '35k - 60k', '60k - 100k', '100k+'];
}
