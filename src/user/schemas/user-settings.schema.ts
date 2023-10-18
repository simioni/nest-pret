import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

/**
 * User SETTINGS Subschemas
 * */
enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
  NONE = 'none',
}

@Schema()
class UserNotificationSettings {
  @Prop({
    type: String,
    enum: NotificationType,
    default: NotificationType.EMAIL,
  })
  @ApiProperty()
  general: NotificationType;

  @Prop({
    type: String,
    enum: NotificationType,
    default: NotificationType.EMAIL,
  })
  @ApiProperty()
  weeklySummary: NotificationType;

  @Prop({
    type: String,
    enum: NotificationType,
    default: NotificationType.EMAIL,
  })
  @ApiProperty()
  promotions: NotificationType;
}

enum UiColorScheme {
  AUTO = 'auto',
  LIGHT = 'light',
  DARK = 'dark',
}

@Schema()
class UserUiSettings {
  @Prop({ type: String, enum: UiColorScheme, default: UiColorScheme.AUTO })
  @ApiProperty()
  colorScheme: UiColorScheme;

  @Prop({ default: false })
  @ApiProperty()
  reducedMotion: boolean;
}

@Schema()
export class UserSettings {
  @Prop({ type: UserNotificationSettings, _id: false })
  @ApiProperty()
  notifications: UserNotificationSettings;

  @Prop({ type: UserUiSettings, _id: false })
  @ApiProperty()
  ui: UserUiSettings;
}
