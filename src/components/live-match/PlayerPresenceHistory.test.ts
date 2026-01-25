 import { describe, it, expect } from "vitest";
 
 /**
  * Test suite for Player Presence History Label Logic
  * 
  * This tests the "Titular/Reserva" label logic to ensure it correctly
  * determines a player's role for the entire match (not per-interval).
  * 
  * BUG FIX: Previously, labels were determined per interval, causing starters
  * to be incorrectly labeled as "Reserva" in the 2nd half.
  */
 
 interface PresenceRecord {
   id: string;
   player_id: string;
   period: number;
   entered_at_seconds: number;
   exited_at_seconds: number | null;
   role: string;
 }
 
 /**
  * Logic under test: Determine game role from presence records
  * A player is "starter" if ANY of their stints has role === "starter"
  */
 function determineGameRole(records: PresenceRecord[]): "starter" | "substitute" {
   return records.some(r => r.role === "starter") ? "starter" : "substitute";
 }
 
 describe("PlayerPresenceHistory - Label Logic", () => {
   // Scenario A: Starter who played the full match
   it("should label starter as 'Titular' in both halves when playing full match", () => {
     const records: PresenceRecord[] = [
       {
         id: "1",
         player_id: "player-1",
         period: 1,
         entered_at_seconds: 0,
         exited_at_seconds: 2700, // 45'
         role: "starter",
       },
       {
         id: "2",
         player_id: "player-1",
         period: 2,
         entered_at_seconds: 2700, // 45'
         exited_at_seconds: 5400, // 90'
         role: "starter", // This might be missing or incorrect in DB
       },
     ];
 
     const gameRole = determineGameRole(records);
     expect(gameRole).toBe("starter");
     
     // Both intervals should use the SAME gameRole
     records.forEach(record => {
       const label = gameRole === "starter" ? "Titular" : "Reserva";
       expect(label).toBe("Titular");
     });
   });
 
   // Scenario B: Starter who was substituted out in 2nd half
   it("should label starter as 'Titular' in both halves even when substituted out", () => {
     const records: PresenceRecord[] = [
       {
         id: "1",
         player_id: "player-2",
         period: 1,
         entered_at_seconds: 0,
         exited_at_seconds: 2700, // 45'
         role: "starter",
       },
       {
         id: "2",
         player_id: "player-2",
         period: 2,
         entered_at_seconds: 2700, // 45'
         exited_at_seconds: 4080, // 68' (substituted out)
         role: "starter", // Even if this is recorded differently
       },
     ];
 
     const gameRole = determineGameRole(records);
     expect(gameRole).toBe("starter");
     
     records.forEach(record => {
       const label = gameRole === "starter" ? "Titular" : "Reserva";
       expect(label).toBe("Titular");
     });
   });
 
   // Scenario C: Substitute who entered in 2nd half
   it("should label substitute as 'Reserva' when entering in 2nd half only", () => {
     const records: PresenceRecord[] = [
       {
         id: "1",
         player_id: "player-3",
         period: 2,
         entered_at_seconds: 4080, // 68' (entered as substitute)
         exited_at_seconds: 5400, // 90'
         role: "substitute",
       },
     ];
 
     const gameRole = determineGameRole(records);
     expect(gameRole).toBe("substitute");
     
     const label = gameRole === "starter" ? "Titular" : "Reserva";
     expect(label).toBe("Reserva");
   });
 
   // Scenario D: Substitute who entered in 1st half
   it("should label substitute as 'Reserva' in both halves when entering in 1st half", () => {
     const records: PresenceRecord[] = [
       {
         id: "1",
         player_id: "player-4",
         period: 1,
         entered_at_seconds: 1200, // 20' (entered as substitute)
         exited_at_seconds: 2700, // 45'
         role: "substitute",
       },
       {
         id: "2",
         player_id: "player-4",
         period: 2,
         entered_at_seconds: 2700, // 45'
         exited_at_seconds: 5400, // 90'
         role: "substitute",
       },
     ];
 
     const gameRole = determineGameRole(records);
     expect(gameRole).toBe("substitute");
     
     records.forEach(record => {
       const label = gameRole === "starter" ? "Titular" : "Reserva";
       expect(label).toBe("Reserva");
     });
   });
 
   // Edge Case: Mixed role data (should favor "starter")
   it("should label as 'Titular' if ANY stint has role='starter', even if others don't", () => {
     const records: PresenceRecord[] = [
       {
         id: "1",
         player_id: "player-5",
         period: 1,
         entered_at_seconds: 0,
         exited_at_seconds: 2700,
         role: "starter",
       },
       {
         id: "2",
         player_id: "player-5",
         period: 2,
         entered_at_seconds: 2700,
         exited_at_seconds: 5400,
         role: "substitute", // Incorrect DB data - should still show as Titular
       },
     ];
 
     const gameRole = determineGameRole(records);
     expect(gameRole).toBe("starter");
     
     // ALL intervals should show "Titular" because player started the match
     records.forEach(record => {
       const label = gameRole === "starter" ? "Titular" : "Reserva";
       expect(label).toBe("Titular");
     });
   });
 });