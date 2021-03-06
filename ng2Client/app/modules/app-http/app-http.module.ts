﻿import { NgModule } from "@angular/core";
import { Http, RequestOptions, XHRBackend } from "@angular/http";

import { AppHttp } from "./app-http.service";

export function createAppHttp(backend: XHRBackend, defaultOptions: RequestOptions) {
    return new AppHttp(backend, defaultOptions);
}

@NgModule({
    providers: [
        {
            provide: Http,
            useFactory: createAppHttp,
            deps: [XHRBackend, RequestOptions]
        }]
})
export class AppHttpModule { }
