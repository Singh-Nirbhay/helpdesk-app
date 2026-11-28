import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { provideRouter } from '@angular/router';

import { App } from './app';
import { environment } from '../environments/environment';

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  function mockHealthResponse(): void {
    const request = httpTesting.expectOne({
      method: 'GET',
      url: `${environment.apiUrl}/Health`
    });

    request.flush({
      status: 'Healthy',
      timestamp: '2026-11-28T12:00:00Z'
    });
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();
    mockHealthResponse();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the application title', async () => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();
    mockHealthResponse();

    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent)
      .toContain('HelpDesk Application');
  });
});
