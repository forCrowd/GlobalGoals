﻿import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Subject } from "rxjs/Subject";

import { ChartConfig, ChartDataItem } from "../ng-chart/ng-chart.module";
import { DataService, ResourcePoolService } from "../data/data.module";
import { Logger } from "../logger/logger.module";

//declare const __moduleName: string;

@Component({
    moduleId: module.id,
    selector: "resource-pool-editor",
    styleUrls: ["resource-pool-editor.component.css"],
    templateUrl: "resource-pool-editor.component.html"
})
export class ResourcePoolEditorComponent implements OnDestroy, OnInit {

    constructor(private dataService: DataService,
        private logger: Logger,
        private resourcePoolService: ResourcePoolService,
        private router: Router) {
    }

    chartConfig: ChartConfig = null;
    currentUser: any = null;
    displayChart: boolean = false;
    displayDescription: boolean = false;
    displayIndexDetails = false;
    errorMessage: string = "";
    isSaving = false;
    resourcePool: any = null;
    saveStream = new Subject();
    subscriptions: any[] = [];

    changeSelectedElement(element: any) {
        this.resourcePool.selectedElement(element);
        this.loadChartData();
    }

    initialize(user: any) {

        // If there is no change, no need to continue
        if (this.currentUser === user) {
            return;
        }

        this.currentUser = user;

        // Clear previous error messages
        this.errorMessage = "";

        // Get resource pool
        this.resourcePoolService.getResourcePoolExpanded()
            .subscribe((resourcePool: any) => {

                if (!resourcePool) {
                    this.errorMessage = "Invalid CMRP";
                    return;
                }

                // It returns an array, set the first item in the list
                this.resourcePool = resourcePool;

                if (this.resourcePool.selectedElement() !== null) {
                    this.loadChartData();
                }
            });
    }

    loadChartData() {

        // Current element
        var element = this.resourcePool.selectedElement();
        if (element === null) {
            return;
        }

        // Item length check
        if (element.ElementItemSet.length > 20) {
            return;
        }

        if (!this.displayIndexDetails) {

            // TODO Check this rule?

            if (element === element.Project.mainElement() &&
                element.totalIncome() > 0) {

                const options: Highcharts.Options = {
                    title: { text: element.Name },
                    chart: { type: "column" },
                    yAxis: {
                        title: { text: "Total Income" }
                    }
                }
                const data: ChartDataItem[] = [];

                element.ElementItemSet.forEach((elementItem: any) => {
                    data.push(new ChartDataItem(elementItem.Name,
                        elementItem.totalIncome(),
                        elementItem.totalIncomeUpdated$));
                });

                this.chartConfig = new ChartConfig(options, data);

            } else {

                const options: Highcharts.Options = {
                    title: { text: element.Name },
                    chart: { type: "pie" }
                };
                const data: ChartDataItem[] = [];

                element.ElementItemSet.forEach((elementItem: any) => {
                    elementItem.ElementCellSet.forEach((elementCell: any) => {
                        if (elementCell.ElementField.RatingEnabled) {
                            data.push(new ChartDataItem(elementCell.ElementItem.Name,
                                +elementCell.numericValue().toFixed(2),
                                elementCell.numericValueUpdated$));
                        }
                    });
                });

                this.chartConfig = new ChartConfig(options, data);
            }

        } else {

            const options = {
                title: { text: "Indexes" },
                chart: { type: "pie" }
            };

            const data: ChartDataItem[] = [];

            element.elementFieldIndexSet()
                .forEach((elementFieldIndex: any) => {
                    data.push(new ChartDataItem(elementFieldIndex.Name,
                        +elementFieldIndex.indexRating().toFixed(2),
                        elementFieldIndex.indexRatingUpdated$));
                });

            this.chartConfig = new ChartConfig(options, data);
        }
    }

    ngOnDestroy(): void {
        for (let i = 0; i < this.subscriptions.length; i++) {
            this.subscriptions[i].unsubscribe();
        }
    }

    ngOnInit(): void {

        // Delayed save operation
        this.saveStream.debounceTime(1500)
            .mergeMap(() => this.dataService.saveChanges()).subscribe();

        // Event handlers
        this.subscriptions.push(
            this.dataService.currentUserChanged$.subscribe((newUser: any) =>
                this.initialize(newUser)));
        this.subscriptions.push(
            this.dataService.saveChangesStarted$.subscribe(() => this.saveChangesStart()));
        this.subscriptions.push(
            this.dataService.saveChangesCompleted$.subscribe(() => this.saveChangesCompleted()));

        this.initialize(this.dataService.currentUser);
    }

    saveChangesStart() {
        this.isSaving = true;
    }

    saveChangesCompleted() {
        this.isSaving = false;
    }
}
