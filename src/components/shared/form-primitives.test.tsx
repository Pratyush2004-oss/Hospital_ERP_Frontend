// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FormField } from "./form-field";
import { FormActions, FormError } from "./form-actions";
import { Combobox } from "./combobox";
import { Input } from "@/components/ui/input";

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: ResizeObserverMock,
  });
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("FormField", () => {
  it("links the label, description and required state to the control", () => {
    render(
      <FormField
        id="email"
        label="Email"
        description="Use your work address."
        required
      >
        <Input />
      </FormField>,
    );

    const input = screen.getByLabelText(/Email/);
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input).toHaveAttribute("id", "email");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAttribute("aria-describedby", "email-description");
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Use your work address.")).toHaveAttribute(
      "id",
      "email-description",
    );
    expect(screen.getByText("required")).toBeInTheDocument();
  });

  it("exposes validation errors through an alert and aria-invalid", () => {
    render(
      <FormField id="email" label="Email" error="Email is required.">
        <Input />
      </FormField>,
    );

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "email-error");
    expect(screen.getByRole("alert")).toHaveTextContent("Email is required.");
    expect(screen.getByRole("alert")).toHaveAttribute("id", "email-error");
  });
});

describe("FormActions", () => {
  it("shows pending state and disables submit and cancel", async () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(
      <FormActions
        isPending
        onCancel={onCancel}
        onSubmit={onSubmit}
        submitLabel="Save"
        pendingLabel="Saving..."
      />,
    );

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("runs submit and cancel handlers when enabled", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(<FormActions onCancel={onCancel} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("renders form-level validation feedback", () => {
    render(<FormError>Unable to save these details.</FormError>);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to save these details.",
    );
  });
});

const options = [
  { value: "alpha", label: "Alpha Clinic" },
  { value: "beta", label: "Beta Clinic" },
];

describe("Combobox", () => {
  it("searches options and selects with the keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <FormField id="clinic" label="Clinic">
        <Combobox
          id="clinic"
          options={options}
          value=""
          onValueChange={onValueChange}
          searchPlaceholder="Search clinics..."
        />
      </FormField>,
    );

    await user.click(screen.getByRole("combobox", { name: "Clinic" }));
    const search = await screen.findByPlaceholderText("Search clinics...");
    await user.type(search, "Beta");
    await user.type(search, "{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("beta");
  });

  it("shows the selected option and empty search state", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        id="clinic"
        options={options}
        value="alpha"
        onValueChange={() => {}}
        placeholder="Select a clinic"
        searchPlaceholder="Search clinics..."
        emptyMessage="No clinics found."
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("Alpha Clinic");
    await user.click(screen.getByRole("combobox"));
    await user.type(await screen.findByPlaceholderText("Search clinics..."), "zzz");
    expect(await screen.findByText("No clinics found.")).toBeInTheDocument();
  });

  it("supports multiple selection without closing the popover", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Combobox
        id="clinic"
        multiple
        options={options}
        value={["alpha"]}
        onValueChange={onValueChange}
        searchPlaceholder="Search clinics..."
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.type(await screen.findByPlaceholderText("Search clinics..."), "Beta");
    await user.click(await screen.findByRole("option", { name: /Beta Clinic/ }));

    expect(onValueChange).toHaveBeenCalledWith(["alpha", "beta"]);
  });

  it("renders loading, error and retry states", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(
      <Combobox
        id="clinic"
        options={[]}
        value=""
        onValueChange={() => {}}
        loading
      />,
    );

    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText("Loading options...")).toBeInTheDocument();

    rerender(
      <Combobox
        id="clinic"
        options={[]}
        value=""
        onValueChange={() => {}}
        error="Could not load clinics."
        onRetry={onRetry}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load clinics.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
