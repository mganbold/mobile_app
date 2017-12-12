import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";

import { IMeter, IUser } from "../../interfaces";
import { StoreServices } from "../../store/services";

@Component({
  selector: "edit-meter-form",
  templateUrl: "edit-meter-form.html"
})
export class EditMeterFormComponent implements OnInit {
  @Input() meter: IMeter | null;
  @Input() user: IUser | null;

  @Output() cancelClicked = new EventEmitter();

  private _editMeter: FormGroup;
  private _providerName: string;
  private _planName: string;

  constructor(
    private _formBuilder: FormBuilder,
    private _storeServices: StoreServices
  ) { }

  ngOnInit() {
    console.log("meter", this.meter, this.user);

    this._providerName = this.meter._provider.split('/').pop() || "No provider";
    this._planName = this.meter._plan || "No plan";

    this._editMeter = this._formBuilder.group({
      name: ["John"],
      meterNumber: [123456],
      provider: ["provider"],
      planName: ["plan name"],
      plan: ["plan"],
      billingStart: [15],
      goal: [100],
      billingCycle: ["1 month"]
    });
  }

  private _keyboardSubmit(): void {

  }

  private _editProvider(): void {

  }

  private _save(): void {
    this._storeServices.updateMeterSettings(this.meter, this.user);
  }

  private _onCancel(): void {
    this.cancelClicked.emit();
  }

  private _onDelete(): void {

  }

}
