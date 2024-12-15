const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CompletionRecord extends Model {
    static associate(models) {
      CompletionRecord.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      CompletionRecord.belongsTo(models.Reminder, {
        foreignKey: 'reminder_id',
        as: 'reminder'
      });
    }
  }

  CompletionRecord.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    reminder_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'reminders',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    scheduled_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    completion_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    completion_time: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'CompletionRecord',
    tableName: 'completion_records',
    timestamps: true,
    indexes: [
      {
        fields: ['reminder_id', 'scheduled_date'],
        unique: true
      }
    ]
  });

  return CompletionRecord;
};