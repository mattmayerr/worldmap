import { Component } from '@angular/core';
import { CountryService } from './country.service'; 
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',  
  templateUrl: './app.component.html',  
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'd280project';
  countryInfo: any;  

  constructor(private countryService: CountryService) {}  

  
  onMapClick(event: MouseEvent) {
    const countryCode = this.extractCountryCode(event);  
    this.countryService.getCountryData(countryCode).subscribe((data) => {
      this.countryInfo = data[1][0];  
    });
  }

  
  extractCountryCode(event: MouseEvent): string {
    const target = event.target as HTMLElement;
    console.log('Clicked element ID:', target.id);
    return target.id.replace('country-', '');  
  }
}

// used event binding by creating events that make the map interactive when you click on a country