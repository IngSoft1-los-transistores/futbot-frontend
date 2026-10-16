import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLeague } from "../src/api/leagues.js";
import { request } from "../src/api/client";
import { read_session } from "../src/auth/session";

vi.mock("../src/api/client", () => ({ request: vi.fn() }));
vi.mock("../src/auth/session", () => ({ read_session: vi.fn() }));

const players = (count, start) =>
  Array.from({ length: count }, (_, i) => ({
    playerId: start + i,
    behaviorId: start + i + 100,
  }));

const input = {
  name: "  Liga de prueba  ",
  is_private: false,
  min_clubs: "3",
  max_clubs: "30",
  match_duration: "90",
  starters: players(3, 1),
  substitutes: players(3, 4),
};

describe("createLeague", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    read_session.mockReturnValue({ access_token: "token-123" });
    request.mockResolvedValue({ code_to_join: "ABC123" });
  });

  it("hace POST a /api/leagues con el token", async () => {
    await createLeague(input);

    const [url, options] = request.mock.calls[0];
    expect(url).toBe("/api/leagues");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer token-123");
  });

  it("envía el body en snake_case y con ids string", async () => {
    await createLeague(input);

    const body = JSON.parse(request.mock.calls[0][1].body);
    expect(body).toEqual({
      name: "Liga de prueba",
      is_private: false,
      min_clubs: 3,
      max_clubs: 30,
      match_duration: 90,
      starters: [
        { player_id: "1", behavior_id: "101" },
        { player_id: "2", behavior_id: "102" },
        { player_id: "3", behavior_id: "103" },
      ],
      substitutes: [
        { player_id: "4", behavior_id: "104" },
        { player_id: "5", behavior_id: "105" },
        { player_id: "6", behavior_id: "106" },
      ],
    });
  });

  it("devuelve la respuesta del backend", async () => {
    await expect(createLeague(input)).resolves.toEqual({
      code_to_join: "ABC123",
    });
  });

  it("lanza error si no hay sesión y no llama al backend", async () => {
    read_session.mockReturnValue(null);

    await expect(createLeague(input)).rejects.toThrow(
      "Tu sesión venció. Iniciá sesión de nuevo."
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("envía una liga pública sin password en el body", async () => {
    await createLeague(input);

    const body = JSON.parse(request.mock.calls[0][1].body);

    expect(body.is_private).toBe(false);
    expect("password" in body).toBe(false);
  });

  it("envía is_private y password para una liga privada", async () => {
    const password = "abc123";

    await createLeague({
      ...input,
      is_private: true,
      password,
    });

    const body = JSON.parse(request.mock.calls[0][1].body);

    expect(body.is_private).toBe(true);
    expect(body.password).toBe(password);
  });
});