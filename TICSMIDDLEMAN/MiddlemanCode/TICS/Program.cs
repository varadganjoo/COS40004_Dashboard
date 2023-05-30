using System;
using System.Text;
using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Extensions.ManagedClient;
using MQTTnet.Protocol;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Threading.Tasks;
using MQTTnet.Formatter;
using System.Threading;
using System.IO;

class Program
{
    static async Task Main(string[] args)
    {
        // MQTT Broker Configuration
        string mqttBrokerAddress;
        int mqttBrokerPort = 1883;
        string mqttTopic = "#";
        string filePath = "mqttBroker.txt";

        // check if file exists, if it does read the mqttBrokerAddress from it
        if (File.Exists(filePath))
        {
            mqttBrokerAddress = File.ReadAllText(filePath);
        }
        else // if file doesn't exist, prompt user for the address and then save it to the file
        {
            Console.WriteLine("Enter MQTT Broker Address:");
            mqttBrokerAddress = Console.ReadLine();

            // save the broker address to the file
            File.WriteAllText(filePath, mqttBrokerAddress);
        }


        // MongoDB Configuration
        string mongoConnectionString = "mongodb+srv://topics:xsMhT89vyecwmC9T@cos40004-cluster.athhnll.mongodb.net/";
        string mongoDatabaseName = "IoT_Project_db";
        string mongoCollectionName = "boards";

        // Create MQTT client options
        var mqttClientOptions = new MqttClientOptionsBuilder()
            .WithTcpServer(mqttBrokerAddress, mqttBrokerPort)
            .WithProtocolVersion(MqttProtocolVersion.V311)
            .Build();

        // Create managed MQTT client options
        var managedOptions = new ManagedMqttClientOptionsBuilder()
            .WithAutoReconnectDelay(TimeSpan.FromSeconds(5))
            .WithClientOptions(mqttClientOptions)
            .Build();

        // Create MQTT client factory
        var mqttClientFactory = new MqttFactory();

        // Create managed MQTT client
        var mqttClient = mqttClientFactory.CreateManagedMqttClient();

        // Configure MQTT message received handler
        mqttClient.ApplicationMessageReceivedAsync += async e =>
        {
            Console.WriteLine("Received application message.");

            // Connect to MongoDB
            var mongoClient = new MongoClient(mongoConnectionString);
            var mongoDatabase = mongoClient.GetDatabase(mongoDatabaseName);
            var devicesCollection = mongoDatabase.GetCollection<BsonDocument>("devices");
            var boardsCollection = mongoDatabase.GetCollection<BsonDocument>(mongoCollectionName); // moved here

            // Check if topic is "SENSOR/Read"
            if (e.ApplicationMessage.Topic == "SENSOR/READ")
            {
                // Retrieve JSON string from MQTT message payload
                string jsonString = Encoding.UTF8.GetString(e.ApplicationMessage.Payload);

                // Create a BsonDocument from the JSON string
                var bsonDocument = BsonDocument.Parse(jsonString);

                // Extract the device_id from the document
                string deviceId = bsonDocument.GetValue("device_id").AsString;

                // Check if the device_id exists in the devices collection
                var filter = Builders<BsonDocument>.Filter.Eq("_id", deviceId);
                var deviceExists = await devicesCollection.Find(filter).AnyAsync();

                if (!deviceExists)
                {
                    // Create a new device document with device_id as _id and name as "default"
                    var newDeviceDocument = new BsonDocument
            {
                { "_id", deviceId },
                { "name", "default" }
            };

                    // Insert the new device document into the devices collection
                    await devicesCollection.InsertOneAsync(newDeviceDocument);
                }

                // Add a timestamp field with the current time
                bsonDocument["timestamp"] = DateTime.UtcNow;

                // Insert the modified BsonDocument into the boards collection
                await boardsCollection.InsertOneAsync(bsonDocument);
                Console.WriteLine("Received JSON data and saved to MongoDB.");
            }

            Console.WriteLine(e.ApplicationMessage.Topic);

            // Additional functionality for reset topic
            if (e.ApplicationMessage.Topic == "reset")
            {
                // Parse boardId from the message payload
                string boardId = Encoding.UTF8.GetString(e.ApplicationMessage.Payload);

                // Create a filter to find documents with the specified board_id
                var sensorFilter = Builders<BsonDocument>.Filter.Eq("device_id", boardId);

                // Create a sort definition for descending order in the timestamp field
                var sortDef = Builders<BsonDocument>.Sort.Descending("timestamp");

                // Fetch the latest document matching the filter
                var latestDocument = await boardsCollection.Find(sensorFilter).Sort(sortDef).Limit(1).FirstOrDefaultAsync();

                // Print the latestDocument
                Console.WriteLine($"Latest Document: {latestDocument}");

                // Check if 'sensors' field exists
                if (latestDocument.Contains("sensors"))
                {
                    var sensorsArray = latestDocument.GetValue("sensors").AsBsonArray;

                    foreach (BsonDocument sensorItem in sensorsArray)
                    {
                        if (sensorItem.Contains("type") && sensorItem.Contains("name"))
                        {
                            // Extract the 'type' and 'name' fields from the BsonDocument
                            var typeField = sensorItem.GetValue("type");
                            var nameField = sensorItem.GetValue("name");

                            // Construct a new BsonDocument with just these fields
                            if (typeField != "i2c")
                            {
                                var newDocument = new BsonDocument
            {
                { "device_id", boardId },
                { "type", typeField },
                { "name", nameField }
            };

                                // Convert the new BsonDocument to a JSON string
                                string payload = newDocument.ToJson();

                                // Build the MQTT message
                                var message = new MqttApplicationMessageBuilder()
                                    .WithTopic("resetresponse")
                                    .WithPayload(payload)
                                    .Build();

                                // Publish the MQTT message
                                await mqttClient.InternalClient.PublishAsync(message);
                                Console.WriteLine(payload);
                                Console.WriteLine("testing");
                            }
                            }
                            else
                            {
                                Console.WriteLine("'type' or 'name' field not found in the sensorItem.");
                            }
                        }
                    }
                else
                    {
                        Console.WriteLine("'sensors' field not found in the latestDocument.");
                    }
                
            };

        };
            // Connect to MQTT broker
            await mqttClient.StartAsync(managedOptions);

            // Subscribe to MQTT topic
            await mqttClient.SubscribeAsync(mqttTopic, MqttQualityOfServiceLevel.AtLeastOnce);

            // Subscribe to reset topic
            await mqttClient.SubscribeAsync("reset", MqttQualityOfServiceLevel.AtLeastOnce);

            Console.WriteLine($"Subscribed to MQTT topics: {mqttTopic}, reset");
            Console.WriteLine("Press any key to exit...");

            // Wait for a key press to exit
            Console.ReadKey();

            // Unsubscribe from MQTT topic
            await mqttClient.UnsubscribeAsync(mqttTopic);
            await mqttClient.UnsubscribeAsync("reset");

            // Disconnect MQTT client
            await mqttClient.StopAsync();
        }
}



