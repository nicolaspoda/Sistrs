import React from "react";
import { render } from "@testing-library/react-native";

// Le module natif @rnmapbox/maps n'existe pas dans cet environnement de
// test (pas de vrai SDK natif Mapbox) : on le mock entièrement. Ce test ne
// vérifie donc PAS le rendu visuel réel de la carte — voir PROGRESS.md.
jest.mock("@rnmapbox/maps", () => {
  const { View } = require("react-native");

  const MockMapView = ({ children, ...props }: any) => (
    <View testID="mock-mapview" {...props}>
      {children}
    </View>
  );
  const MockCamera = (props: any) => <View testID="mock-camera" {...props} />;
  const MockPointAnnotation = ({ children, ...props }: any) => (
    <View testID="mock-point-annotation" {...props}>
      {children}
    </View>
  );

  return {
    __esModule: true,
    default: { setAccessToken: jest.fn() },
    MapView: MockMapView,
    Camera: MockCamera,
    PointAnnotation: MockPointAnnotation,
  };
});

const ORIGINAL_ENV = process.env;

describe("EventLocationMap", () => {
  beforeEach(() => {
    // Le composant lit EXPO_PUBLIC_MAPBOX_TOKEN et appelle
    // Mapbox.setAccessToken au niveau module (pas dans le composant lui-même),
    // donc on doit reset le registre de modules et re-require après avoir
    // positionné process.env pour chaque scénario (token présent / absent).
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("se monte sans erreur avec un token Mapbox et des coordonnées valides", () => {
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = "fake-token-for-tests";
    const Mapbox = require("@rnmapbox/maps").default;
    const { EventLocationMap } = require("../EventLocationMap");

    const { getByTestId } = render(
      <EventLocationMap latitude={48.8566} longitude={2.3522} title="Soirée test" />
    );

    expect(getByTestId("mock-mapview")).toBeTruthy();
    expect(Mapbox.setAccessToken).toHaveBeenCalledWith("fake-token-for-tests");
  });

  it("transmet bien les coordonnées reçues au composant Mapbox mocké (Camera + marqueur)", () => {
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = "fake-token-for-tests";
    const { EventLocationMap } = require("../EventLocationMap");

    const latitude = 45.764;
    const longitude = 4.8357;

    const { getByTestId } = render(
      <EventLocationMap latitude={latitude} longitude={longitude} title="Autre soirée" />
    );

    // Mapbox attend les coordonnées en [longitude, latitude], pas l'inverse.
    expect(getByTestId("mock-camera").props.centerCoordinate).toEqual([longitude, latitude]);
    expect(getByTestId("mock-point-annotation").props.coordinate).toEqual([longitude, latitude]);
  });

  it("ne crashe pas et affiche un message de repli quand EXPO_PUBLIC_MAPBOX_TOKEN est absent", () => {
    delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
    const Mapbox = require("@rnmapbox/maps").default;
    const { EventLocationMap } = require("../EventLocationMap");

    const { queryByTestId, getByText } = render(
      <EventLocationMap latitude={48.8566} longitude={2.3522} title="Soirée test" />
    );

    expect(queryByTestId("mock-mapview")).toBeNull();
    expect(getByText(/Carte indisponible/i)).toBeTruthy();
    expect(Mapbox.setAccessToken).not.toHaveBeenCalled();
  });
});
