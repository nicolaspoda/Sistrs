// ============================================================================
// Sistrs — Types TypeScript miroir du schéma Supabase (supabase/schema.sql)
// ============================================================================
// Un type par table + un type par enum. Les colonnes générées (ex.
// `profiles.status`) sont typées en lecture seule côté client.
// ============================================================================

// ----------------------------------------------------------------------------
// ENUMS
// ----------------------------------------------------------------------------
export type UserRole = "participant" | "organizer";
export type AgeBracket = "18-25" | "26-30" | "30+";
export type UserStatus = "commun" | "bronze" | "argent" | "or" | "diamant";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type RegistrationStatus = "pending" | "confirmed" | "cancelled";
export type FriendshipStatus = "pending" | "accepted" | "declined";
export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "event_reminder"
  | "event_update"
  | "new_follower"
  | "new_post"
  | "poll_created"
  | "new_message"
  | "registration_confirmed";

// ----------------------------------------------------------------------------
// CATEGORIES
// ----------------------------------------------------------------------------
export interface Category {
  id: string;
  name: string;
  emoji: string | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// PROFILES
// ----------------------------------------------------------------------------
export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  age_bracket: AgeBracket;
  role: UserRole;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  id_document_url: string | null;
  face_id_enabled: boolean;
  push_token: string | null;
  activity_count: number;
  /** Colonne générée côté base — ne jamais écrire cette valeur depuis le client. */
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface ParticipantPreference {
  profile_id: string;
  category_id: string;
}

export interface OrganizerSpecialty {
  profile_id: string;
  category_id: string;
}

// ----------------------------------------------------------------------------
// CHANNELS
// ----------------------------------------------------------------------------
export interface Channel {
  id: string;
  organizer_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ChannelSubscription {
  channel_id: string;
  subscriber_id: string;
  subscribed_at: string;
}

// ----------------------------------------------------------------------------
// EVENTS
// ----------------------------------------------------------------------------
export interface Event {
  id: string;
  organizer_id: string;
  channel_id: string;
  category_id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  start_at: string;
  end_at: string | null;
  meeting_point: string;
  meeting_lat: number | null;
  meeting_lng: number | null;
  max_participants: number;
  registration_deadline: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface EventShoppingListItem {
  id: string;
  event_id: string;
  label: string;
  is_checked: boolean;
  added_by: string | null;
  created_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  participant_id: string;
  status: RegistrationStatus;
  face_id_verified_at: string | null;
  registered_at: string;
}

export interface EventReview {
  id: string;
  event_id: string;
  participant_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// CHANNEL POSTS / LIKES
// ----------------------------------------------------------------------------
export interface ChannelPost {
  id: string;
  channel_id: string;
  event_id: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

export interface ChannelPostLike {
  post_id: string;
  profile_id: string;
  created_at: string;
}

// ----------------------------------------------------------------------------
// POLLS
// ----------------------------------------------------------------------------
export interface Poll {
  id: string;
  channel_id: string;
  post_id: string | null;
  question: string;
  created_at: string;
  closes_at: string | null;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  position: number;
}

export interface PollVote {
  poll_id: string;
  option_id: string;
  profile_id: string;
  voted_at: string;
}

// ----------------------------------------------------------------------------
// FRIENDSHIPS
// ----------------------------------------------------------------------------
export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
}

// ----------------------------------------------------------------------------
// MESSAGERIE PRIVÉE
// ----------------------------------------------------------------------------
export interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------------------------------
export interface Notification {
  id: string;
  profile_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
